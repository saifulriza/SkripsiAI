import { OpenAI } from 'openai'
import axios from 'axios'

const MODEL_CAPABILITIES = {
  'gpt-3.5-turbo': {
    maxTokens: 4096,
    contextSize: 16384,
  },
  'gpt-4': {
    maxTokens: 8192,
    contextSize: 32768,
  },
  'claude-2.1': {
    maxTokens: 12000,
    contextSize: 100000,
  },
  'claude-instant-1.2': {
    maxTokens: 8000,
    contextSize: 80000,
  },
  'deepseek-chat': {
    maxTokens: 8192,
    contextSize: 32768,
  },
  'deepseek-coder': {
    maxTokens: 8192,
    contextSize: 32768,
  },
}

class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
    this.requests = []
  }

  async waitForSlot() {
    const now = Date.now()
    this.requests = this.requests.filter((time) => now - time < this.timeWindow)

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.timeWindow - (now - oldestRequest)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.requests.push(now)
  }
}

class AIService {
  constructor() {
    this.keyValidationCache = new Map()
    this.currentConfig = null
    this.requestLog = new Map()
    this.rateLimiter = new RateLimiter()
  }

  async validateApiKey(provider, apiKey) {
    const cacheKey = `${provider}:${apiKey}`
    if (this.keyValidationCache.has(cacheKey)) {
      const { isValid, timestamp } = this.keyValidationCache.get(cacheKey)
      // Cache API key validation for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return isValid
      }
    }

    try {
      switch (provider) {
        case 'openai': {
          const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
          await client.models.list()
          break
        }
        case 'anthropic': {
          const response = await axios.get('https://api.anthropic.com/v1/models', {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
          })
          if (response.status !== 200) throw new Error('Invalid API key')
          break
        }
        case 'deepseek': {
          const response = await axios.get('https://api.deepseek.com/v1/models', {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          })
          if (response.status !== 200) throw new Error('Invalid API key')
          break
        }
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }

      this.keyValidationCache.set(cacheKey, { isValid: true, timestamp: Date.now() })
      return true
    } catch (error) {
      this.keyValidationCache.set(cacheKey, { isValid: false, timestamp: Date.now() })
      console.error(`API key validation failed for ${provider}:`, error)
      return false
    }
  }

  async setupProviders(config) {
    this.currentConfig = config

    // Validate API key before setting up provider
    const isValid = await this.validateApiKey(config.provider, config.apiKey)
    if (!isValid) {
      throw new Error(`Invalid API key for ${config.provider}. Please check your configuration.`)
    }

    const openaiTransformer = {
      messages: (msgs) =>
        msgs.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      chunk: (chunk) => chunk.choices[0]?.delta?.content || '',
    }

    const anthropicTransformer = {
      messages: (msgs) =>
        msgs
          .reduce(
            (acc, msg) =>
              acc +
              `\n\n${msg.role === 'system' ? 'Human' : msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}: ${msg.content}`,
            '',
          )
          .trim() + '\n\nAssistant:',
      chunk: (chunk) => {
        try {
          const data = JSON.parse(chunk.toString().slice(6))
          return data.completion || ''
        } catch {
          return ''
        }
      },
    }

    const deepseekTransformer = {
      messages: (msgs) => msgs,
      chunk: (chunk) => {
        try {
          const data = JSON.parse(chunk.toString().slice(6))
          return data.choices?.[0]?.delta?.content || ''
        } catch {
          return ''
        }
      },
    }

    this.providers = {
      openai: {
        client: new OpenAI({
          apiKey: config.apiKey,
          dangerouslyAllowBrowser: true,
        }),
        chat: async (messages, options = {}) => {
          const formattedMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }))

          // Check if content might exceed model capacity
          const totalContent = messages.reduce((acc, msg) => acc + msg.content, '')
          if (this.needsUpgrade(config.model, totalContent)) {
            const fallbackModel = this.getFallbackModel(config.model)
            if (fallbackModel) {
              return this.chat(messages, options, {
                ...config,
                model: fallbackModel,
              })
            }
          }

          const requestOptions = {
            model: config.model,
            messages: formattedMessages,
            ...Object.fromEntries(
              Object.entries({
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 1000,
                presence_penalty: options.presence_penalty,
                frequency_penalty: options.frequency_penalty,
              }).filter(([, v]) => v != null),
            ),
          }

          const logEntry = this.logRequest('openai', requestOptions)
          const startTime = Date.now()

          try {
            const response =
              await this.providers.openai.client.chat.completions.create(requestOptions)
            const content = response.choices[0].message.content
            const duration = Date.now() - startTime

            this.updateLogEntry(logEntry, {
              status: 'success',
              response: content,
              duration,
              completionTokens: response.usage?.completion_tokens,
              promptTokens: response.usage?.prompt_tokens,
              totalTokens: response.usage?.total_tokens,
            })

            return content
          } catch (error) {
            const errorDetails = {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data,
            }

            this.updateLogEntry(logEntry, {
              status: 'error',
              error: errorDetails,
              duration: Date.now() - startTime,
            })

            if (
              error.message?.includes('context length') ||
              error.message?.includes('maximum context length')
            ) {
              return this.handleCapacityError(error, messages, options, config)
            }

            throw this.handleOpenAIError(error)
          }
        },
        chatStream: this.setupStreamingProvider(
          'openai',
          (opts) => this.providers.openai.client.chat.completions.create(opts),
          openaiTransformer,
        ),
      },
      anthropic: {
        client: axios.create({
          baseURL: 'https://api.anthropic.com/v1',
          headers: {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        }),
        chat: async (messages, options = {}) => {
          const formattedMessages = messages.reduce((acc, msg) => {
            if (msg.role === 'system') {
              return (
                acc +
                `\n\nHuman: ${msg.content}\n\nAssistant: I understand. I will follow these instructions.`
              )
            }
            if (msg.role === 'user') {
              return acc + `\n\nHuman: ${msg.content}`
            }
            if (msg.role === 'assistant') {
              return acc + `\n\nAssistant: ${msg.content}`
            }
          }, '')

          const requestOptions = {
            model: config.model,
            prompt: formattedMessages + '\n\nAssistant:',
            ...Object.fromEntries(
              Object.entries({
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 1000,
                presence_penalty: options.presence_penalty,
                frequency_penalty: options.frequency_penalty,
              }).filter(([, v]) => v != null),
            ),
          }

          const logEntry = this.logRequest('anthropic', requestOptions)
          const startTime = Date.now()

          try {
            const response = await this.providers.anthropic.client.post('/complete', requestOptions)
            const content = response.data.completion
            const duration = Date.now() - startTime

            this.updateLogEntry(logEntry, {
              status: 'success',
              response: content,
              duration,
              completionTokens: response.data.usage?.completion_tokens,
              promptTokens: response.data.usage?.prompt_tokens,
            })

            return content
          } catch (error) {
            const errorDetails = {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data,
            }

            this.updateLogEntry(logEntry, {
              status: 'error',
              error: errorDetails,
              duration: Date.now() - startTime,
            })

            throw this.handleAnthropicError(error)
          }
        },
        chatStream: this.setupStreamingProvider(
          'anthropic',
          (opts) =>
            this.providers.anthropic.client.post('/complete', opts, { responseType: 'stream' }),
          anthropicTransformer,
        ),
      },
      deepseek: {
        client: axios.create({
          baseURL: 'https://api.deepseek.com/v1',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
        chat: async (messages, options = {}) => {
          const formattedMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }))

          const requestOptions = {
            model: config.model,
            messages: formattedMessages,
            ...Object.fromEntries(
              Object.entries({
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 1000,
                presence_penalty: options.presence_penalty,
                frequency_penalty: options.frequency_penalty,
              }).filter(([, v]) => v != null),
            ),
          }

          const logEntry = this.logRequest('deepseek', requestOptions)
          const startTime = Date.now()

          try {
            const response = await this.providers.deepseek.client.post(
              '/chat/completions',
              requestOptions,
            )
            const content = response.data.choices[0].message.content
            const duration = Date.now() - startTime

            this.updateLogEntry(logEntry, {
              status: 'success',
              response: content,
              duration,
              completionTokens: response.data.usage?.completion_tokens,
              promptTokens: response.data.usage?.prompt_tokens,
            })

            return content
          } catch (error) {
            const errorDetails = {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data,
            }

            this.updateLogEntry(logEntry, {
              status: 'error',
              error: errorDetails,
              duration: Date.now() - startTime,
            })

            throw this.handleDeepseekError(error)
          }
        },
        chatStream: this.setupStreamingProvider(
          'deepseek',
          (opts) =>
            this.providers.deepseek.client.post('/chat/completions', opts, {
              responseType: 'stream',
            }),
          deepseekTransformer,
        ),
      },
    }
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  needsUpgrade(model, content) {
    const estimatedTokens = this.estimateTokens(content)
    const capability = MODEL_CAPABILITIES[model]

    // If estimated tokens exceed 80% of model's capacity, suggest upgrade
    return estimatedTokens > capability?.maxTokens * 0.8
  }

  getFallbackModel(model) {
    return this.fallbackModels[model]
  }

  handleCapacityError(error, messages, options, config) {
    const fallbackModel = this.getFallbackModel(config.model)
    if (fallbackModel && MODEL_CAPABILITIES[fallbackModel]) {
      console.log(`Switching to ${fallbackModel} due to capacity limits`)
      return this.chat(messages, options, {
        ...config,
        model: fallbackModel,
      })
    }
    throw error
  }

  logRequest(provider, requestData) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      provider,
      model: requestData.model,
      messageCount: requestData.messages.length,
      options: { ...requestData },
      status: 'pending',
    }

    // Store messages separately for retry functionality
    logEntry.options.messages = requestData.messages

    console.group(`🤖 AI Request - ${timestamp}`)
    console.log('Provider:', provider)
    console.log('Model:', requestData.model)
    console.log(
      'Message Structure:',
      requestData.messages.map((m) => ({ role: m.role, contentLength: m.content.length })),
    )
    console.groupEnd()

    this.requestLog.unshift(logEntry) // Add to beginning of array
    if (this.requestLog.length > 100) {
      this.requestLog.pop() // Remove oldest entry
    }

    return logEntry
  }

  updateLogEntry(logEntry, updates) {
    const index = this.requestLog.findIndex((entry) => entry.timestamp === logEntry.timestamp)
    if (index !== -1) {
      if (updates.totalTokens) {
        const capability = MODEL_CAPABILITIES[this.currentConfig.model]
        updates.tokenUsagePercentage = Math.round(
          (updates.totalTokens / capability.maxTokens) * 100,
        )
      }
      this.requestLog[index] = { ...this.requestLog[index], ...updates }
    }
  }

  handleOpenAIError(error) {
    if (error.response?.data?.error) {
      const errorData = error.response.data.error
      switch (errorData.code) {
        case 'rate_limit_exceeded':
          throw new Error('OpenAI rate limit exceeded. Please try again later.')
        case 'invalid_api_key':
          throw new Error('Invalid OpenAI API key. Please check your configuration.')
        case 'context_length_exceeded':
          throw new Error('Content is too long for the model. Please reduce the input size.')
        default:
          throw new Error(`OpenAI Error: ${errorData.message}`)
      }
    }
    throw error
  }

  handleAnthropicError(error) {
    if (error.response?.data?.error) {
      const errorData = error.response.data.error
      switch (errorData.type) {
        case 'rate_limit_error':
          throw new Error('Anthropic rate limit exceeded. Please try again later.')
        case 'authentication_error':
          throw new Error('Invalid Anthropic API key. Please check your configuration.')
        case 'invalid_request_error':
          if (errorData.message.includes('context length')) {
            throw new Error('Content is too long for the model. Please reduce the input size.')
          }
          throw new Error(`Invalid request: ${errorData.message}`)
        default:
          throw new Error(`Anthropic Error: ${errorData.message}`)
      }
    }
    throw error
  }

  handleDeepseekError(error) {
    if (error.response?.data?.error) {
      const errorData = error.response.data.error
      switch (errorData.code) {
        case 'too_many_requests':
          throw new Error('DeepSeek rate limit exceeded. Please try again later.')
        case 'invalid_api_key':
          throw new Error('Invalid DeepSeek API key. Please check your configuration.')
        case 'context_too_long':
          throw new Error('Content is too long for the model. Please reduce the input size.')
        default:
          throw new Error(`DeepSeek Error: ${errorData.message}`)
      }
    }
    throw error
  }

  async retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        if (!this.isRetryableError(error)) {
          throw error
        }

        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    throw lastError
  }

  isRetryableError(error) {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true
    }

    // Rate limits and server errors
    if (error.response) {
      const status = error.response.status
      return status === 429 || (status >= 500 && status <= 599)
    }

    return false
  }

  async chat(messages, options = {}, config = null) {
    try {
      if (!config) {
        throw new Error('AI configuration is required')
      }

      await this.setupProviders(config)

      const { provider, model, apiKey } = config

      switch (provider) {
        case 'openai': {
          const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
          const completion = await openai.chat.completions.create({
            model: model || 'gpt-3.5-turbo',
            messages: messages,
            ...options,
          })
          return completion.choices[0].message.content
        }
        case 'anthropic': {
          const response = await axios.post(
            'https://api.anthropic.com/v1/complete',
            {
              model: model || 'claude-2.1',
              prompt:
                messages.reduce((acc, msg) => {
                  if (msg.role === 'system') {
                    return (
                      acc +
                      `\n\nHuman: ${msg.content}\n\nAssistant: I understand. I will follow these instructions.`
                    )
                  }
                  if (msg.role === 'user') {
                    return acc + `\n\nHuman: ${msg.content}`
                  }
                  if (msg.role === 'assistant') {
                    return acc + `\n\nAssistant: ${msg.content}`
                  }
                }, '') + '\n\nAssistant:',
              ...options,
            },
            {
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
              },
            },
          )
          return response.data.completion
        }
        case 'deepseek': {
          const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
              model: model || 'deepseek-chat',
              messages: messages,
              ...options,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            },
          )
          return response.data.choices[0].message.content
        }
        default:
          throw new Error(`Unsupported AI provider: ${provider}`)
      }
    } catch (error) {
      console.error('AI Chat Error:', error)
      switch (this.currentConfig?.provider) {
        case 'openai':
          return this.handleOpenAIError(error)
        case 'anthropic':
          return this.handleAnthropicError(error)
        case 'deepseek':
          return this.handleDeepseekError(error)
        default:
          throw error
      }
    }
  }

  async chatStream(messages, options = {}, config = null, onChunk = () => {}) {
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages must be an array')
    }

    if (config && (!this.currentConfig || config !== this.currentConfig)) {
      await this.setupProviders(config)
    }

    if (!this.currentConfig) {
      throw new Error('AI service not initialized. Please provide configuration.')
    }

    const provider = this.providers[this.currentConfig.provider]
    if (!provider) {
      throw new Error(`Provider ${this.currentConfig.provider} not supported`)
    }

    // Wait for rate limit slot
    await this.rateLimiters[this.currentConfig.provider].waitForSlot()

    return this.retryWithBackoff(async () => {
      return (
        provider.chatStream?.(messages, options, onChunk) ||
        provider.chat(messages, options).then((response) => {
          onChunk(response)
          return response
        })
      )
    })
  }

  setupStreamingProvider(provider, client, transformer) {
    return async (messages, options = {}, onChunk) => {
      const requestOptions = {
        ...options,
        stream: true,
        model: this.currentConfig.model,
        messages: transformer.messages(messages),
      }

      const logEntry = this.logRequest(provider, requestOptions)
      const startTime = Date.now()
      let fullResponse = ''

      try {
        const stream = await client(requestOptions)
        for await (const chunk of stream) {
          const content = transformer.chunk(chunk)
          if (content) {
            fullResponse += content
            onChunk(content)
          }
        }

        this.updateLogEntry(logEntry, {
          status: 'success',
          response: fullResponse,
          duration: Date.now() - startTime,
        })

        return fullResponse
      } catch (error) {
        this.updateLogEntry(logEntry, {
          status: 'error',
          error: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          },
          duration: Date.now() - startTime,
        })
        throw error
      }
    }
  }

  getRequestLog() {
    return this.requestLog
  }

  clearRequestLog() {
    this.requestLog = []
  }

  clearKeyValidationCache() {
    this.keyValidationCache.clear()
  }
}

export const aiService = new AIService()
