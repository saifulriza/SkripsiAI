<template>
  <div v-if="error" class="error-boundary q-pa-md">
    <q-card class="bg-negative text-white">
      <q-card-section>
        <div class="text-h6">Something went wrong</div>
        <p class="q-mt-md">{{ error.message }}</p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Retry" @click="retry" />
      </q-card-actions>
    </q-card>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'

const error = ref(null)
const emit = defineEmits(['error', 'retry'])

onErrorCaptured((err, component, info) => {
  error.value = err
  emit('error', { error: err, component, info })
  return false
})

function retry() {
  error.value = null
  emit('retry')
}
</script>

<style scoped>
.error-boundary {
  max-width: 600px;
  margin: 0 auto;
}
</style>
