import { defineBoot } from '#q-app/wrappers'
import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'

const storageKey = 'user-locale'
const defaultLocale = 'en-US'

function getSavedLocale() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(storageKey) || getBrowserLocale() || defaultLocale
  }
  return defaultLocale
}

function getBrowserLocale() {
  const navigatorLocale = navigator?.language?.toLowerCase() ?? ''
  const locales = Object.keys(messages)
  return locales.find((locale) => navigatorLocale.includes(locale.toLowerCase()))
}

export const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: defaultLocale,
  messages,
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, locale)
  }
  document.querySelector('html').setAttribute('lang', locale)
}

export default defineBoot(({ app }) => {
  // Set initial locale from localStorage
  const savedLocale = getSavedLocale()
  if (savedLocale) {
    setLocale(savedLocale)
  }

  app.use(i18n)
})
