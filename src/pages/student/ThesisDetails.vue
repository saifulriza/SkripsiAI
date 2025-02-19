<template>
  <q-page padding>
    <ErrorBoundary>
      <div v-if="loading" class="flex flex-center">
        <q-spinner color="primary" size="3em" />
      </div>
      <div v-else-if="thesis && chapters" class="thesis-details">
        <ThesisForm
          :thesis="thesis"
          :chapters="chapters"
          @thesis-updated="onThesisUpdated"
          @chapter-saved="onChapterSaved"
          @back="$router.push('/student')"
        />
      </div>
      <div v-else class="flex flex-center">
        <p>{{ $t('thesis.notFound') }}</p>
      </div>
    </ErrorBoundary>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useThesisStore } from 'src/stores/thesis/thesis'
import ThesisForm from 'src/components/thesis/ThesisForm.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const thesisStore = useThesisStore()

const thesis = ref(null)
const chapters = ref([])
const loading = ref(true)

async function loadThesis() {
  loading.value = true
  try {
    const fullThesis = await thesisStore.fetchThesis(route.params.id)
    thesis.value = fullThesis
    chapters.value = fullThesis.chapters || []
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to load thesis details: ${error.message}`,
    })
    router.push('/student')
  } finally {
    loading.value = false
  }
}

async function onThesisUpdated() {
  await loadThesis()
}

async function onChapterSaved() {
  await loadThesis()
}

onMounted(() => {
  loadThesis()
})
</script>

<style scoped>
.thesis-details {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
