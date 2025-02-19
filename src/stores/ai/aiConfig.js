import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import { validateEnvVariables } from 'src/utils/env'
import { aiService } from 'src/services/ai'

export const useAIConfigStore = defineStore('aiConfig', () => {
  const currentProvider = ref('openai')
  const currentModel = ref('gpt-3.5-turbo')
  const envValid = ref(validateEnvVariables())
  const apiKeyStatus = ref({})

  // Add initialization on store creation
  onMounted(async () => {
    await validateApiKeys()
  })

  async function validateApiKeys() {
    for (const [provider, config] of Object.entries(providers)) {
      try {
        const isValid = await aiService.validateApiKey(provider, config.apiKey)
        apiKeyStatus.value[provider] = {
          isValid,
          message: isValid ? 'API key is valid' : 'Invalid API key',
        }
      } catch (error) {
        apiKeyStatus.value[provider] = {
          isValid: false,
          message: error.message,
        }
      }
    }
  }

  function clearApiKeyStatus() {
    apiKeyStatus.value = {}
    aiService.clearKeyValidationCache()
  }

  const providers = {
    openai: {
      name: 'OpenAI',
      models: ['gpt-3.5-turbo', 'gpt-4'],
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      features: {
        streaming: true,
        functionCalling: true,
        longContext: true,
      },
      validateConfig: (config) => {
        if (!envValid.value) {
          throw new Error('Missing required environment variables')
        }
        if (!config.apiKey) {
          throw new Error('OpenAI API key is required')
        }
        if (!config.model) {
          throw new Error('OpenAI model must be specified')
        }
        if (!['gpt-3.5-turbo', 'gpt-4'].includes(config.model)) {
          throw new Error('Invalid OpenAI model specified')
        }
      },
    },
    anthropic: {
      name: 'Anthropic',
      models: ['claude-2.1', 'claude-instant-1.2'],
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      features: {
        streaming: true,
        functionCalling: false,
        longContext: true,
      },
      validateConfig: (config) => {
        if (!envValid.value) {
          throw new Error('Missing required environment variables')
        }
        if (!config.apiKey) {
          throw new Error('Anthropic API key is required')
        }
        if (!config.model) {
          throw new Error('Anthropic model must be specified')
        }
        if (!['claude-2.1', 'claude-instant-1.2'].includes(config.model)) {
          throw new Error('Invalid Anthropic model specified')
        }
      },
    },
    deepseek: {
      name: 'DeepSeek',
      models: ['deepseek-chat', 'deepseek-coder'],
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
      features: {
        streaming: true,
        functionCalling: false,
        longContext: false,
      },
      validateConfig: (config) => {
        if (!envValid.value) {
          throw new Error('Missing required environment variables')
        }
        if (!config.apiKey) {
          throw new Error('DeepSeek API key is required')
        }
        if (!config.model) {
          throw new Error('DeepSeek model must be specified')
        }
        if (!['deepseek-chat', 'deepseek-coder'].includes(config.model)) {
          throw new Error('Invalid DeepSeek model specified')
        }
      },
    },
  }

  function setProvider(provider) {
    if (providers[provider]) {
      currentProvider.value = provider
      // Reset to first available model when changing provider
      currentModel.value = providers[provider].models[0]
    }
  }

  function setModel(model) {
    const provider = providers[currentProvider.value]
    if (provider && provider.models.includes(model)) {
      currentModel.value = model
    }
  }

  function getCurrentConfig() {
    const provider = currentProvider.value
    const config = providers[provider]

    if (!config) {
      throw new Error('Invalid AI provider selected')
    }

    return {
      provider,
      model: currentModel.value,
      apiKey: config.apiKey,
    }
  }

  // Add revalidation method
  async function ensureValidConfig() {
    const config = getCurrentConfig()
    if (!apiKeyStatus.value[config.provider]?.isValid) {
      await validateApiKeys()
      if (!apiKeyStatus.value[config.provider]?.isValid) {
        throw new Error('Invalid or missing API key configuration')
      }
    }
    return config
  }

  // Add computed properties for UI
  const currentProviderName = computed(() => providers[currentProvider.value]?.name || '')
  const isConfigValid = computed(() => {
    try {
      getCurrentConfig()
      return true
    } catch {
      return false
    }
  })

  return {
    currentProvider,
    currentModel,
    providers,
    apiKeyStatus,
    setProvider,
    setModel,
    getCurrentConfig,
    ensureValidConfig,
    currentProviderName,
    isConfigValid,
    validateApiKeys,
    clearApiKeyStatus,
  }
})
