<template>
  <q-card class="q-pa-md">
    <q-card-section>
      <div class="row items-center justify-between">
        <div>
          <div class="text-h6">{{ thesis?.title }}</div>
          <div class="text-subtitle2">By {{ thesis?.profiles?.full_name }}</div>
        </div>
        <div>
          <q-chip :color="getStatusColor(thesis?.status)" text-color="white">
            {{ thesis?.status }}
          </q-chip>
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="row items-center q-mb-md">
        <div class="text-subtitle1">Chapter {{ currentChapter }}</div>
        <q-space />
        <div class="row q-gutter-sm">
          <q-btn
            flat
            round
            color="grey"
            icon="chevron_left"
            @click="previousChapter"
            :disable="currentChapter <= 1"
          />
          <q-btn
            flat
            round
            color="grey"
            icon="chevron_right"
            @click="nextChapter"
            :disable="currentChapter >= 5"
          />
        </div>
      </div>

      <q-input
        v-model="chapterContent"
        type="textarea"
        label="Thesis Content"
        filled
        readonly
        autogrow
      />
    </q-card-section>

    <q-card-section>
      <div class="row q-gutter-md">
        <q-btn
          label="Analyze with AI"
          color="primary"
          @click="analyzeWithAI"
          :loading="analyzing"
          :disable="!chapterContent"
        />
        <q-btn-dropdown color="secondary" label="Update Status" flat>
          <q-list>
            <q-item
              v-for="status in availableStatuses"
              :key="status"
              clickable
              v-close-popup
              @click="updateStatus(status)"
            >
              <q-item-section>
                <q-item-label>{{ status }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </q-card-section>

    <q-card-section v-if="currentAiReview">
      <div class="text-h6">AI Analysis</div>
      <q-separator class="q-my-md" />

      <div class="analysis-sections q-gutter-y-md">
        <template v-for="(section, index) in parsedAnalysis" :key="index">
          <div class="analysis-section">
            <div class="text-subtitle1 text-weight-bold">{{ section.title }}</div>
            <div class="text-body1" v-html="section.content"></div>
          </div>
          <q-separator v-if="index < parsedAnalysis.length - 1" spaced />
        </template>
      </div>

      <div class="text-caption q-mt-sm">
        Reviewed at: {{ new Date(currentAiReview.reviewed_at).toLocaleString() }}
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useThesisStore } from 'src/stores/thesis/thesis'
import { useQuasar } from 'quasar'

const props = defineProps({
  thesis: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['review-saved', 'status-updated'])

const thesisStore = useThesisStore()
const $q = useQuasar()

const currentChapter = ref(1)
const analyzing = ref(false)
const currentAiReview = ref(null)

const availableStatuses = ['draft', 'submitted', 'reviewed', 'approved']

const chapterContent = computed(() => {
  const chapter = props.thesis.chapters?.find((c) => c.chapter_number === currentChapter.value)
  return chapter?.content || ''
})

const parsedAnalysis = computed(() => {
  if (!currentAiReview.value?.review_content) return []

  // Parse the AI review content into sections
  const content = currentAiReview.value.review_content
  const sections = []

  const lines = content.split('\n')
  let currentSection = null

  lines.forEach((line) => {
    if (line.match(/^\d+\./)) {
      // New section started
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
})

watch(currentChapter, () => {
  currentAiReview.value = null
})

function getStatusColor(status) {
  const colors = {
    draft: 'grey',
    submitted: 'blue',
    reviewed: 'orange',
    approved: 'positive',
  }
  return colors[status] || 'grey'
}

async function updateStatus(newStatus) {
  try {
    await thesisStore.updateThesisStatus(props.thesis.id, newStatus)
    emit('status-updated')
    $q.notify({
      type: 'positive',
      message: `Thesis status updated to ${newStatus}`,
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to update thesis status',
    })
    console.error('Error updating status:', error)
  }
}

async function analyzeWithAI() {
  if (!chapterContent.value) return

  analyzing.value = true
  try {
    const analysis = await thesisStore.analyzeThesis(chapterContent.value, currentChapter.value)
    const chapter = props.thesis.chapters?.find((c) => c.chapter_number === currentChapter.value)

    if (chapter) {
      const savedReview = await thesisStore.saveAIReview(chapter.id, analysis)
      currentAiReview.value = savedReview
      emit('review-saved')

      $q.notify({
        type: 'positive',
        message: 'AI analysis completed and saved',
      })
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to analyze thesis',
    })
    console.error('Error analyzing thesis:', error)
  } finally {
    analyzing.value = false
  }
}

function previousChapter() {
  if (currentChapter.value > 1) {
    currentChapter.value--
  }
}

function nextChapter() {
  if (currentChapter.value < 5) {
    currentChapter.value++
  }
}
</script>

<style scoped>
.analysis-sections {
  max-height: 500px;
  overflow-y: auto;
}

.analysis-section {
  padding: 8px 0;
}
</style>
