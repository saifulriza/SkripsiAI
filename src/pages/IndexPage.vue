<template>
  <q-page class="flex flex-center column q-pa-md">
    <div class="text-center q-pa-md">
      <h4 class="q-mt-none q-mb-md">Welcome to Thesis Management System</h4>
      <p class="text-body1">A platform for managing and reviewing thesis with AI assistance</p>
    </div>

    <div class="row q-gutter-md" v-if="!authStore.isAuthenticated">
      <q-btn color="primary" label="Login" to="/login" unelevated />
      <q-btn color="secondary" label="Register" to="/register" unelevated />
    </div>

    <div v-else class="text-center">
      <p class="text-h6 q-mb-md">Welcome back!</p>
      <q-btn
        :to="authStore.role === 'student' ? '/student' : '/lecturer'"
        color="primary"
        label="Go to Dashboard"
        unelevated
      />
    </div>

    <div class="row q-col-gutter-lg q-mt-xl justify-center">
      <div class="col-12 col-md-4">
        <q-card class="text-center">
          <q-card-section>
            <q-icon name="school" size="3em" color="primary" />
            <h6 class="q-mt-md q-mb-sm">For Students</h6>
            <p>Write and manage your thesis with AI-powered suggestions</p>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card class="text-center">
          <q-card-section>
            <q-icon name="psychology" size="3em" color="secondary" />
            <h6 class="q-mt-md q-mb-sm">AI Assistance</h6>
            <p>Get instant feedback and suggestions for your thesis content</p>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card class="text-center">
          <q-card-section>
            <q-icon name="assignment_turned_in" size="3em" color="positive" />
            <h6 class="q-mt-md q-mb-sm">For Lecturers</h6>
            <p>Review and provide feedback with AI-powered analysis</p>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useAuthStore } from 'src/stores/auth/auth'

const authStore = useAuthStore()
</script>
