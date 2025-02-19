<template>
  <div>
    <div v-if="error" class="ai-error">
      <q-banner rounded class="bg-negative text-white">
        <template v-slot:avatar>
          <q-icon name="error" color="white" />
        </template>
        <div class="text-h6">AI Service Error</div>
        <p class="q-mb-md">{{ getFriendlyErrorMessage(error) }}</p>
        <template v-slot:action>
          <q-btn flat color="white" label="Retry" @click="handleRetry" :loading="retrying" />
          <q-btn
            flat
            color="white"
            label="Configure"
            @click="showConfig = true"
            v-if="isConfigurationError"
          />
        </template>
      </q-banner>

      <q-dialog v-model="showConfig">
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">AI Configuration</div>
          </q-card-section>

          <q-card-section>
            <AIProviderSelector />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>

    <div v-else>
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AIProviderSelector from './AIProviderSelector.vue'

const props = defineProps({
  error: {
    type: Error,
    default: null,
  },
  onRetry: {
    type: Function,
    default: () => {},
  },
})

const emit = defineEmits(['update:error'])

const showConfig = ref(false)
const retrying = ref(false)

const isConfigurationError = computed(() => {
  if (!props.error) return false
  const message = props.error.message.toLowerCase()
  return (
    message.includes('api key') ||
    message.includes('configuration') ||
    message.includes('invalid provider')
  )
})

function getFriendlyErrorMessage(error) {
  const message = error.message.toLowerCase()

  if (message.includes('rate limit')) {
    return 'Rate limit exceeded. Please wait a moment before trying again.'
  }

  if (message.includes('context length') || message.includes('maximum context')) {
    return 'The input is too long for this model. Try splitting it into smaller parts or switch to a model with larger context.'
  }

  if (message.includes('api key')) {
    return 'There is an issue with the API key. Please check your configuration.'
  }

  if (message.includes('timeout')) {
    return 'The request timed out. Please try again.'
  }

  if (message.includes('network')) {
    return 'Network error occurred. Please check your connection and try again.'
  }

  return error.message
}

async function handleRetry() {
  if (retrying.value) return

  retrying.value = true
  try {
    await props.onRetry()
    emit('update:error', null)
  } catch (error) {
    emit('update:error', error)
  } finally {
    retrying.value = false
  }
}
</script>

<style scoped>
.ai-error {
  max-width: 600px;
  margin: 0 auto;
}
</style>
