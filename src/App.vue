<template>
  <LoadingScreen v-if="loading" message="Loading application..." />
  <router-view v-else />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from 'src/stores/auth/auth'
import { useRouter } from 'vue-router'
import LoadingScreen from 'src/components/LoadingScreen.vue'
import { useQuasar } from 'quasar'

const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()
const loading = ref(true)

onMounted(async () => {
  try {
    await authStore.checkSession()

    // If user is logged in, redirect to appropriate dashboard
    if (authStore.isAuthenticated) {
      if (authStore.isStudent) {
        router.push('/student')
      } else if (authStore.isLecturer) {
        router.push('/lecturer')
      }
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to restore session: ${error.message}`,
    })
  } finally {
    loading.value = false
  }
})
</script>
