<template>
  <div class="fullscreen bg-white text-primary flex flex-center">
    <q-spinner-dots size="3em" />
    <div class="text-subtitle1 q-mt-md">{{ message || 'Loading...' }}</div>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: ''
  }
})
</script>