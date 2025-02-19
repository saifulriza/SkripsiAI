<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> {{ $t('app.title') }} </q-toolbar-title>

        <LanguageSwitcher class="q-mr-md" />

        <div v-if="authStore.isAuthenticated">
          <q-btn flat round dense icon="person" class="q-mr-xs">
            <q-menu>
              <q-list style="min-width: 150px">
                <q-item-label header>{{ authStore.user?.email }}</q-item-label>
                <q-separator />
                <q-item clickable @click="handleLogout">
                  <q-item-section>{{ $t('auth.logout') }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered v-if="authStore.isAuthenticated">
      <q-list>
        <q-item-label header> {{ $t('nav.title') }} </q-item-label>

        <!-- Student Menu Items -->
        <template v-if="authStore.role === 'student'">
          <q-item clickable v-ripple :to="{ name: 'student' }" exact>
            <q-item-section avatar>
              <q-icon name="school" />
            </q-item-section>
            <q-item-section> {{ $t('nav.myThesis') }} </q-item-section>
          </q-item>
        </template>

        <!-- Lecturer Menu Items -->
        <template v-if="authStore.role === 'lecturer'">
          <q-item clickable v-ripple :to="{ name: 'lecturer' }" exact>
            <q-item-section avatar>
              <q-icon name="assignment" />
            </q-item-section>
            <q-item-section> {{ $t('nav.reviewTheses') }} </q-item-section>
          </q-item>
        </template>
      </q-list>

      <AIProviderSelector class="q-px-md q-mt-md" />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from 'src/stores/auth/auth'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from 'src/components/LanguageSwitcher.vue'
import AIProviderSelector from 'components/AIProviderSelector.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()
const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

async function handleLogout() {
  try {
    await authStore.logout()
    router.push('/login')
    $q.notify({
      type: 'positive',
      message: t('auth.logoutSuccess'),
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('auth.logoutError', { error: error.message }),
    })
  }
}
</script>
