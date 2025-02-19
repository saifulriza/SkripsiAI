<template>
  <div class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-subtitle1">AI Configuration</div>
      <q-btn-group flat>
        <q-btn flat round dense icon="bug_report" @click="showDebugPanel = true" color="grey-7">
          <q-tooltip>Show Debug Panel</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          :icon="validationIcon"
          :color="validationColor"
          @click="validateCurrentConfig"
        >
          <q-tooltip>{{ validationMessage }}</q-tooltip>
        </q-btn>
      </q-btn-group>
    </div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row items-center q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-select
              v-model="currentProvider"
              :options="providerOptions"
              label="AI Provider"
              :rules="[(val) => !!val || 'Provider is required']"
              :error="!!configError"
              :error-message="configError"
              :loading="switching"
              :disable="switching"
            >
              <template v-slot:option="{ itemProps, opt, toggleOption }">
                <q-item v-bind="itemProps" @click="toggleOption(opt)">
                  <q-item-section>
                    <q-item-label>{{ opt.label }}</q-item-label>
                    <q-item-label caption>{{ getProviderDescription(opt.value) }}</q-item-label>
                    <q-item-label caption class="row items-center q-gutter-x-sm">
                      <q-chip
                        v-if="getProviderFeatures(opt.value).streaming"
                        dense
                        size="sm"
                        color="positive"
                        text-color="white"
                      >
                        <q-icon name="stream" size="xs" class="q-mr-xs" />
                        Streaming
                      </q-chip>
                      <q-chip
                        v-if="getProviderFeatures(opt.value).functionCalling"
                        dense
                        size="sm"
                        color="info"
                        text-color="white"
                      >
                        <q-icon name="functions" size="xs" class="q-mr-xs" />
                        Functions
                      </q-chip>
                      <q-chip
                        v-if="getProviderFeatures(opt.value).longContext"
                        dense
                        size="sm"
                        color="secondary"
                        text-color="white"
                      >
                        <q-icon name="description" size="xs" class="q-mr-xs" />
                        Long Context
                      </q-chip>

                      <q-chip
                        :color="getApiKeyStatusColor(opt.value)"
                        text-color="white"
                        dense
                        size="sm"
                      >
                        <q-icon :name="getApiKeyStatusIcon(opt.value)" size="xs" class="q-mr-xs" />
                        {{ getApiKeyStatus(opt.value) }}
                      </q-chip>
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip
                      v-if="opt.value === currentProvider"
                      color="primary"
                      text-color="white"
                      dense
                    >
                      Active
                    </q-chip>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <div class="q-mt-sm row items-center justify-between">
              <q-btn
                flat
                dense
                color="primary"
                icon="refresh"
                @click="validateApiKeys"
                :loading="validating"
              >
                <q-tooltip>Validate API Keys</q-tooltip>
              </q-btn>
              <div class="text-caption text-grey" v-if="lastValidationTime">
                Last validated: {{ formatValidationTime(lastValidationTime) }}
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <q-select
              v-model="currentModel"
              :options="modelOptions"
              label="AI Model"
              :rules="[(val) => !!val || 'Model is required']"
              :loading="switching"
              :disable="switching"
            >
              <template v-slot:option="{ itemProps, opt, toggleOption }">
                <q-item v-bind="itemProps" @click="toggleOption(opt)">
                  <q-item-section>
                    <q-item-label>{{ opt.label }}</q-item-label>
                    <q-item-label caption>{{ getModelDescription(opt.value) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge :color="getModelBadgeColor(opt.value)" class="q-mr-sm">
                      {{ getModelCapability(opt.value) }}
                    </q-badge>
                    <q-chip
                      v-if="opt.value === currentModel"
                      color="primary"
                      text-color="white"
                      dense
                    >
                      Active
                    </q-chip>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
        </div>
      </q-card-section>

      <q-card-section v-if="getActiveModelInfo">
        <q-list dense>
          <q-item>
            <q-item-section>
              <q-item-label caption>Model Capabilities</q-item-label>
              <q-item-label>
                <q-icon name="memory" class="q-mr-xs" />
                Max Tokens: {{ getActiveModelInfo.maxTokens.toLocaleString() }}
              </q-item-label>
              <q-item-label>
                <q-icon name="data_object" class="q-mr-xs" />
                Context Size: {{ getActiveModelInfo.contextSize.toLocaleString() }} tokens
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-banner v-if="!aiConfig.isConfigValid" rounded class="bg-warning text-white q-mb-md">
      <template v-slot:avatar>
        <q-icon name="warning" color="white" />
      </template>
      Configuration is incomplete or invalid. Please check your API keys in the environment
      variables.
    </q-banner>

    <div v-else-if="!switching" class="text-positive q-mt-sm">
      <q-icon name="check_circle" /> AI Configuration is valid and ready
    </div>

    <AIDebugPanel v-model="showDebugPanel" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAIConfigStore } from 'src/stores/ai/aiConfig'
import { useQuasar } from 'quasar'
import AIDebugPanel from './AIDebugPanel.vue'

const aiConfig = useAIConfigStore()
const showDebugPanel = ref(false)
const configError = ref('')
const switching = ref(false)
const $q = useQuasar()

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

const providerDescriptions = {
  openai: 'Industry standard LLM with wide range of capabilities',
  anthropic: 'Advanced language model with strong reasoning abilities',
  deepseek: 'Specialized model with focus on code and technical content',
}

const modelDescriptions = {
  'gpt-3.5-turbo': 'Fast and cost-effective for most tasks',
  'gpt-4': 'Most capable GPT model with advanced reasoning',
  'claude-2.1': 'Advanced model with high accuracy and long context',
  'claude-instant-1.2': 'Faster response times with good performance',
  'deepseek-chat': 'General purpose chat model',
  'deepseek-coder': 'Specialized for code generation and analysis',
}

const modelCapabilities = {
  'gpt-3.5-turbo': 'Fast',
  'gpt-4': 'Advanced',
  'claude-2.1': 'Advanced',
  'claude-instant-1.2': 'Fast',
  'deepseek-chat': 'Standard',
  'deepseek-coder': 'Code',
}

const modelBadgeColors = {
  'gpt-3.5-turbo': 'green',
  'gpt-4': 'purple',
  'claude-2.1': 'purple',
  'claude-instant-1.2': 'green',
  'deepseek-chat': 'blue',
  'deepseek-coder': 'deep-orange',
}

const getActiveModelInfo = computed(() => MODEL_CAPABILITIES[aiConfig.currentModel])

const currentProvider = computed({
  get: () => aiConfig.currentProvider,
  set: async (value) => {
    if (value === aiConfig.currentProvider) return

    switching.value = true
    try {
      aiConfig.setProvider(value)
      await validateCurrentConfig()
      $q.notify({
        type: 'positive',
        message: `Switched to ${aiConfig.providers[value].name}`,
      })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: `Failed to switch provider: ${error.message}`,
      })
    } finally {
      switching.value = false
    }
  },
})

const currentModel = computed({
  get: () => aiConfig.currentModel,
  set: async (value) => {
    if (value === aiConfig.currentModel) return

    switching.value = true
    try {
      aiConfig.setModel(value)

      await validateCurrentConfig()
      $q.notify({
        type: 'positive',
        message: `Switched to model: ${value.label}`,
      })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: `Failed to switch model: ${error.message}`,
      })
    } finally {
      switching.value = false
    }
  },
})

const providerOptions = computed(() => {
  if (!aiConfig?.providers) return []
  return Object.entries(aiConfig.providers).map(([key, provider]) => ({
    label: provider?.name || key,
    value: key,
  }))
})

const modelOptions = computed(
  () =>
    aiConfig.providers[currentProvider.value]?.models.map((model) => ({
      label: model,
      value: model,
    })) || [],
)

const validationIcon = computed(() => (aiConfig.isConfigValid ? 'check_circle' : 'error'))

const validationColor = computed(() => (aiConfig.isConfigValid ? 'positive' : 'negative'))

const validationMessage = computed(() =>
  aiConfig.isConfigValid ? 'Configuration is valid' : 'Configuration is invalid',
)

const validating = ref(false)
const lastValidationTime = ref(null)

function getApiKeyStatusColor(provider) {
  const status = aiConfig.apiKeyStatus[provider]
  if (!status) return 'grey'
  return status.isValid ? 'positive' : 'negative'
}

function getApiKeyStatusIcon(provider) {
  const status = aiConfig.apiKeyStatus[provider]
  if (!status) return 'help'
  return status.isValid ? 'check_circle' : 'error'
}

function getApiKeyStatus(provider) {
  const status = aiConfig.apiKeyStatus[provider]
  if (!status) return 'Not Validated'
  return status.isValid ? 'Valid' : 'Invalid'
}

function formatValidationTime(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleString()
}

async function validateApiKeys() {
  if (validating.value) return

  validating.value = true
  try {
    await aiConfig.validateApiKeys()
    lastValidationTime.value = Date.now()
    $q.notify({
      type: 'positive',
      message: 'API keys validated successfully',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to validate API keys: ${error.message}`,
    })
  } finally {
    validating.value = false
  }
}

function getProviderDescription(provider) {
  return providerDescriptions[provider] || ''
}

function getModelDescription(model) {
  return modelDescriptions[model] || ''
}

function getModelCapability(model) {
  return modelCapabilities[model] || 'Standard'
}

function getModelBadgeColor(model) {
  return modelBadgeColors[model] || 'grey'
}

function getProviderFeatures(provider) {
  return (
    aiConfig.providers[provider]?.features || {
      streaming: false,
      functionCalling: false,
      longContext: false,
    }
  )
}

async function validateCurrentConfig() {
  configError.value = ''
  try {
    const config = aiConfig.getCurrentConfig()
    if (!config) {
      throw new Error('Invalid configuration')
    }
  } catch (error) {
    configError.value = error.message
    $q.notify({
      type: 'negative',
      message: `Configuration error: ${error.message}`,
    })
    throw error
  }
}

// Validate on component mount
validateCurrentConfig()
onMounted(async () => {
  await validateApiKeys()
})
</script>
