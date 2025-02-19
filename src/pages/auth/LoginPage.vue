<template>
  <q-page class="flex flex-center">
    <q-card class="login-card" style="min-width: 350px">
      <q-card-section class="text-center">
        <div class="text-h5 q-mb-md">Login</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            filled
            :rules="[(val) => !!val || 'Email is required']"
          />

          <q-input
            v-model="password"
            type="password"
            label="Password"
            filled
            :rules="[(val) => !!val || 'Password is required']"
          />

          <div class="q-mt-md">
            <q-btn
              label="Login"
              type="submit"
              color="primary"
              class="full-width"
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center">
        <p class="q-ma-none">
          Don't have an account?
          <router-link to="/register" class="text-primary">Register here</router-link>
        </p>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from 'src/stores/auth/auth'
import { useQuasar } from 'quasar'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const $q = useQuasar()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    const result = await authStore.login(email.value, password.value)

    $q.notify({
      type: 'positive',
      message: 'Login successful',
    })

    // Get the redirect path if it exists, otherwise use default routes
    const redirectPath =
      route.query.redirect || (result.role === 'student' ? '/student' : '/lecturer')
    await router.replace(redirectPath)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Login failed',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-card {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}
</style>
