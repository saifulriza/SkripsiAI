<template>
  <q-page class="q-pa-md">
    <h5 class="q-mt-none">{{ $t('nav.reviewTheses') }}</h5>

    <ErrorBoundary @error="handleError" @retry="loadTheses">
      <div v-if="loading" class="text-center q-pa-md">
        <q-spinner color="primary" size="3em" />
        <p>Loading theses...</p>
      </div>

      <div v-else-if="theses.length === 0" class="text-center q-pa-md">
        <q-icon name="assignment" size="4em" color="grey-5" />
        <p class="text-h6 text-grey-7">No thesis submissions to review yet</p>
      </div>

      <div v-else>
        <div class="row q-col-gutter-md">
          <div v-for="thesis in theses" :key="thesis.id" class="col-12">
            <ErrorBoundary @error="(e) => handleThesisError(e, thesis)">
              <q-card>
                <q-card-section>
                  <ThesisReview
                    :thesis="thesis"
                    @review-saved="onReviewSaved"
                    @status-updated="loadTheses"
                  />
                </q-card-section>

                <!-- AI Analysis History Section -->
                <q-card-section v-if="thesis.aiReviews && thesis.aiReviews.length > 0">
                  <div class="text-h6 q-mb-md">AI Analysis History</div>
                  <div class="row q-col-gutter-md">
                    <div v-for="review in thesis.aiReviews" :key="review.id" class="col-12">
                      <q-expansion-item
                        group="reviews"
                        :label="'Chapter ' + review.chapters?.chapter_number"
                        :caption="new Date(review.reviewed_at).toLocaleString()"
                      >
                        <q-card>
                          <q-card-section>
                            <div
                              v-for="(section, index) in parseFeedback(review.review_content)"
                              :key="index"
                              class="q-mb-md"
                            >
                              <div class="text-subtitle2 text-weight-medium text-primary">
                                {{ section.title }}
                              </div>
                              <p class="q-mt-sm" v-html="section.content"></p>
                            </div>
                          </q-card-section>
                        </q-card>
                      </q-expansion-item>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from 'src/stores/auth/auth'
import { useThesisStore } from 'src/stores/thesis/thesis'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ThesisReview from 'src/components/thesis/ThesisReview.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'

const authStore = useAuthStore()
const thesisStore = useThesisStore()
const router = useRouter()
const $q = useQuasar()

const theses = ref([])
const loading = ref(true)

function parseFeedback(content) {
  if (!content) return []

  const sections = []
  const lines = content.split('\n')
  let currentSection = null

  lines.forEach((line) => {
    if (line.match(/^\d+\./)) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: line.replace(/^\d+\.\s*/, ''),
        content: '',
      }
    } else if (currentSection && line.trim()) {
      currentSection.content += line + '<br>'
    }
  })

  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

async function loadTheses() {
  loading.value = true
  try {
    const fetchedTheses = await thesisStore.fetchAllTheses()
    // Load full thesis data including chapters and AI reviews for each thesis
    const loadedTheses = await Promise.all(
      fetchedTheses.map(async (thesis) => {
        const fullThesis = await thesisStore.fetchThesis(thesis.id)
        // Fetch AI reviews for this thesis
        const { data: aiReviews } = await thesisStore.fetchAIReviews(thesis.id)
        return { ...fullThesis, aiReviews }
      }),
    )
    theses.value = loadedTheses
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load theses',
    })
    console.error('Error loading theses:', error)
  } finally {
    loading.value = false
  }
}

async function onReviewSaved() {
  $q.notify({
    type: 'positive',
    message: 'Review saved successfully',
  })
  await loadTheses()
}

function handleError({ error }) {
  $q.notify({
    type: 'negative',
    message: error.message || 'An error occurred while loading theses',
  })
}

function handleThesisError({ error }, thesis) {
  $q.notify({
    type: 'negative',
    message: `Error with thesis "${thesis.title}": ${error.message}`,
  })
}

onMounted(async () => {
  if (!authStore.isLecturer) {
    router.push('/')
    return
  }
  await loadTheses()
})
</script>

<script>
export default {
  name: 'LecturerDashboard',
}
</script>
