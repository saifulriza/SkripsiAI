<template>
  <q-btn-dropdown flat dense :label="currentLocale" icon="language">
    <q-list>
      <q-item clickable v-close-popup @click="changeLocale('en-US')">
        <q-item-section>
          <q-item-label>English</q-item-label>
        </q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="changeLocale('id-ID')">
        <q-item-section>
          <q-item-label>Indonesia</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from 'src/boot/i18n'

const { locale } = useI18n()

const currentLocale = computed(() => {
  return locale.value === 'en-US' ? 'English' : 'Indonesia'
})

function changeLocale(newLocale) {
  setLocale(newLocale)
}
</script>
