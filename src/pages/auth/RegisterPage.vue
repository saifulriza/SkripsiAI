<template>
  <q-page class="flex flex-center">
    <q-card class="register-card" style="min-width: 350px">
      <q-card-section class="text-center">
        <div class="text-h5 q-mb-md">Register</div>
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
            :rules="[
              (val) => !!val || 'Password is required',
              (val) => val.length >= 6 || 'Password must be at least 6 characters',
            ]"
          />

          <q-input
            v-model="fullName"
            label="Full Name"
            filled
            :rules="[(val) => !!val || 'Full name is required']"
          />

          <q-select
            v-model="selectedRole"
            :options="roleOptions"
            label="Role"
            filled
            emit-value
            map-options
            :rules="[(val) => !!val || 'Role is required']"
          />

          <div class="q-mt-md">
            <q-btn
              label="Register"
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
          Already have an account?
          <router-link to="/login" class="text-primary">Login here</router-link>
        </p>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth/auth'
import { useQuasar } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()
const $q = useQuasar()

const email = ref('')
const password = ref('')
const fullName = ref('')
const selectedRole = ref(null)
const loading = ref(false)

const roleOptions = [
  { label: 'Student', value: 'student' },
  { label: 'Lecturer', value: 'lecturer' },
]

async function onSubmit() {
  if (!selectedRole.value) {
    $q.notify({
      type: 'warning',
      message: 'Please select a role',
    })
    return
  }

  loading.value = true
  try {
    console.log('Attempting registration with role:', selectedRole.value)
    const result = await authStore.register(email.value, password.value, selectedRole.value)
    console.log('Registration result:', result)

    if (result?.user && result?.role) {
      // Verify the role matches what was selected
      if (result.role !== selectedRole.value) {
        throw new Error('Role verification failed. Please contact support.')
      }

      $q.notify({
        type: 'positive',
        message: 'Registration successful! Please check your email for confirmation.',
        timeout: 5000,
      })

      // Delay redirect to ensure user sees the success message
      setTimeout(() => {
        router.push(`/${result.role}`)
      }, 1500)
    } else {
      throw new Error('Invalid registration response')
    }
  } catch (err) {
    console.error('Registration error:', err)

    let errorMessage = 'Registration failed. '
    if (err.message.includes('already registered')) {
      errorMessage = 'This email is already registered. Please login instead.'
    } else if (err.message.includes('valid email')) {
      errorMessage = 'Please enter a valid email address.'
    } else if (err.message.includes('verification failed')) {
      errorMessage = 'Role verification failed. Please try again or contact support.'
    } else if (err.message.includes('multiple rows')) {
      errorMessage = 'An error occurred with your profile. Please try again or contact support.'
    } else {
      errorMessage += err.message || 'Please try again.'
    }

    $q.notify({
      type: 'negative',
      message: errorMessage,
      timeout: 5000,
    })

    if (errorMessage.includes('already registered')) {
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-card {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}
</style>
