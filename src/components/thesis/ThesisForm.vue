<template>
  <div class="thesis-form">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6">{{ thesis?.title }}</div>
      <div class="row q-gutter-sm">
        <q-chip :color="getStatusColor(thesis?.status)" text-color="white">
          {{ $t(`thesis.status.${thesis?.status}`) }}
        </q-chip>
        <q-btn flat round size="sm" icon="edit" @click="showTitleEditor = true" />
      </div>
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="justify"
      narrow-indicator
    >
      <q-tab name="write" :label="$t('thesis.tabs.write')" icon="edit" />
      <q-tab name="history" :label="$t('thesis.tabs.history')" icon="history" />
      <q-tab name="structure" label="Chapter Structure" icon="format_list_bulleted" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <!-- Write Tab -->
      <q-tab-panel name="write">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-3">
              <q-card>
                <q-card-section>
                  <div class="text-subtitle1">Chapter Navigation</div>
                  <q-list separator>
                    <q-item
                      v-for="num in 5"
                      :key="num"
                      clickable
                      :active="chapter === num"
                      @click="selectChapter(num)"
                      v-ripple
                    >
                      <q-item-section>
                        <q-item-label>{{ $t(`thesis.chapters.${num}`) }}</q-item-label>
                        <q-item-label caption>
                          <q-badge
                            :color="getChapterStatusColor(num)"
                            :label="getChapterStatus(num)"
                          />
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon :name="getChapterIcon(num)" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-9">
              <q-card>
                <q-card-section>
                  <div class="row items-center justify-between q-mb-md">
                    <div class="text-h6">{{ $t(`thesis.chapters.${chapter}`) }}</div>
                    <div class="row q-gutter-sm">
                      <q-btn
                        flat
                        icon="psychology"
                        label="AI Write"
                        color="primary"
                        @click="showAIWriteDialog = true"
                        :disable="!chapter"
                      />
                      <q-btn
                        flat
                        icon="auto_fix_high"
                        label="Enhance"
                        color="secondary"
                        @click="enhanceContent"
                        :disable="!content || !chapter"
                      />
                    </div>
                  </div>
                  <MarkdownEditor v-model="content" :label="$t('thesis.content')" class="q-mb-md">
                    <template #before>
                      <q-btn-dropdown flat color="primary" label="Insert">
                        <q-list>
                          <q-item clickable v-close-popup @click="insertTemplate('section')">
                            <q-item-section>New Section</q-item-section>
                          </q-item>
                          <q-item clickable v-close-popup @click="insertTemplate('citation')">
                            <q-item-section>Citation</q-item-section>
                          </q-item>
                          <q-item clickable v-close-popup @click="insertTemplate('table')">
                            <q-item-section>Table</q-item-section>
                          </q-item>
                          <q-item clickable v-close-popup @click="insertTemplate('figure')">
                            <q-item-section>Figure</q-item-section>
                          </q-item>
                        </q-list>
                      </q-btn-dropdown>
                    </template>
                  </MarkdownEditor>
                  <div class="row q-gutter-md">
                    <q-btn
                      :label="$t('common.save')"
                      type="submit"
                      color="primary"
                      :loading="saving"
                    />
                    <q-space />
                    <q-btn
                      v-if="thesis?.status === 'draft'"
                      :label="$t('thesis.submit')"
                      color="positive"
                      @click="submitForReview"
                      :disable="!isThesisComplete"
                    >
                      <q-tooltip v-if="!isThesisComplete">
                        {{ getMissingChaptersMessage() }}
                      </q-tooltip>
                    </q-btn>
                  </div>
                </q-card-section>
              </q-card>

              <!-- AI Suggestions Card -->
              <q-card v-if="aiSuggestions" class="q-mt-md">
                <q-card-section>
                  <div class="text-h6">{{ $t('thesis.ai.suggestions') }}</div>
                  <div v-for="(section, index) in parsedSuggestions" :key="index" class="q-mt-md">
                    <div class="text-subtitle1 text-weight-bold">{{ section.title }}</div>
                    <p class="q-mt-sm" v-html="section.content"></p>
                    <q-btn
                      flat
                      color="primary"
                      :label="$t('common.apply')"
                      size="sm"
                      @click="applySuggestion(section)"
                      class="q-mt-sm"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-form>
      </q-tab-panel>

      <!-- History Tab -->
      <q-tab-panel name="history">
        <div v-if="loading" class="text-center q-pa-md">
          <q-spinner-dots color="primary" size="2em" />
          <p>{{ $t('common.loading') }}</p>
        </div>

        <div v-else-if="feedbackHistory.length === 0" class="text-center q-pa-md text-grey-7">
          <q-icon name="history" size="4em" color="grey-5" />
          <p class="text-subtitle1 q-mt-md">{{ $t('thesis.feedback.noHistory') }}</p>
          <p class="text-caption">
            {{ $t('thesis.ai.generateSuggestions') }} {{ $t('thesis.feedback.inWriteTab') }}
          </p>
        </div>

        <div v-else class="feedback-history">
          <div class="text-subtitle1 q-mb-md">{{ $t('thesis.feedback.latestFirst') }}</div>
          <div class="row q-col-gutter-md">
            <div v-for="feedback in feedbackHistory" :key="feedback.id" class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center justify-between q-mb-sm">
                    <div class="text-subtitle2 text-weight-medium">
                      {{ $t(`thesis.chapters.${feedback.chapters.chapter_number}`) }}
                    </div>
                    <q-chip size="sm" outline>
                      {{ new Date(feedback.reviewed_at).toLocaleDateString() }}
                    </q-chip>
                  </div>

                  <q-separator class="q-my-sm" />

                  <div
                    v-for="(section, index) in parseFeedback(feedback.review_content)"
                    :key="index"
                    class="q-mb-md"
                  >
                    <div class="text-subtitle2 text-weight-medium text-primary">
                      {{ section.title }}
                    </div>
                    <p class="q-mt-sm text-body2" v-html="section.content"></p>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>
      </q-tab-panel>

      <!-- Structure Tab -->
      <q-tab-panel name="structure">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-8">
            <q-card>
              <q-card-section>
                <div class="text-h6">Chapter Structure</div>
                <p class="text-caption">Manage and organize your thesis chapters</p>

                <div v-for="num in 5" :key="num" class="q-mt-lg">
                  <div class="row items-center justify-between">
                    <div class="text-subtitle1 text-weight-bold">
                      {{ $t(`thesis.chapters.${num}`) }}
                    </div>
                    <q-btn flat round size="sm" icon="edit" @click="editChapterStructure(num)" />
                  </div>
                  <q-card bordered flat class="q-mt-sm">
                    <q-card-section>
                      <div v-if="getChapterStructure(num)" v-html="getChapterStructure(num)" />
                      <div v-else class="text-grey-7">
                        No structure defined. Click edit to add structure.
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-4">
            <q-card>
              <q-card-section>
                <div class="text-subtitle1">Progress Overview</div>
                <q-linear-progress :value="completionProgress" color="primary" class="q-mt-md" />
                <div class="text-caption q-mt-sm">
                  {{ Math.round(completionProgress * 100) }}% Complete
                </div>

                <q-list separator class="q-mt-md">
                  <q-item v-for="num in 5" :key="num">
                    <q-item-section>
                      <q-item-label>{{ $t(`thesis.chapters.${num}`) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-chip
                        :color="getChapterStatusColor(num)"
                        :label="getChapterStatus(num)"
                        text-color="white"
                        size="sm"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <!-- AI Write Dialog -->
    <q-dialog
      v-model="showAIWriteDialog"
      persistent
      @show="onAIWriteDialogOpen"
      @hide="onAIWriteDialogClose"
    >
      <q-card style="min-width: 600px">
        <q-card-section class="text-h6 row items-center">
          {{ $t('thesis.ai.write') }} - {{ chapter ? $t(`thesis.chapters.${chapter}`) : '' }}
          <q-space />
          <div v-if="generating" class="row items-center">
            <q-spinner color="primary" size="24px" class="q-mr-sm" />
            <span class="text-caption">
              {{
                $t('thesis.ai.continueGeneration.iterationProgress').replace(
                  '{n}',
                  thesisStore.getCurrentGenerationContext()?.iterationCount || 1,
                )
              }}
            </span>
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-y-md">
          <template v-if="!generating">
            <q-select
              v-model="aiWriteType"
              :options="aiWriteOptions"
              option-label="label"
              :label="$t('thesis.ai.contentType')"
              :hint="$t('thesis.ai.instructionsHint')"
              filled
              :loading="!aiWriteType"
            >
              <template v-slot:selected>
                <div v-if="aiWriteType" class="text-body2">
                  {{ aiWriteType.label }}
                </div>
              </template>
            </q-select>

            <div v-if="aiWriteType" class="q-mt-md">
              <div class="text-subtitle2 q-mb-sm">{{ $t('thesis.ai.instructions') }}</div>
              <q-card flat bordered class="bg-grey-1">
                <q-card-section style="white-space: pre-line">
                  {{ aiWritePrompt }}
                </q-card-section>
              </q-card>
            </div>
          </template>

          <template v-else>
            <div class="text-center q-pa-md">
              <q-spinner-dots color="primary" size="40px" />
              <div class="text-subtitle1 q-mt-md">{{ $t('thesis.ai.generating') }}</div>
              <div class="text-body2 text-grey q-mt-sm">
                {{
                  $t('thesis.ai.continueGeneration.iterationProgress').replace(
                    '{n}',
                    thesisStore.getCurrentGenerationContext()?.iterationCount || 1,
                  )
                }}
              </div>
              <div class="text-caption text-grey">{{ $t('thesis.ai.generatingHint') }}</div>
            </div>
          </template>

          <div class="text-caption text-grey-8">
            {{ $t('thesis.ai.contextNote') }}
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1">
          <q-btn
            flat
            :label="$t('common.cancel')"
            color="primary"
            v-close-popup
            :disable="generating"
          />
          <q-btn
            flat
            :label="$t('common.generate')"
            color="primary"
            @click="generateAIContent"
            :loading="generating"
            :disable="!aiWriteType || generating"
          >
            <q-tooltip v-if="!aiWriteType">
              {{ $t('thesis.ai.selectTypeAndPrompt') }}
            </q-tooltip>
          </q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Title Editor Dialog -->
    <q-dialog v-model="showTitleEditor">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Edit Thesis Title</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="editedTitle"
            label="Thesis Title"
            filled
            autogrow
            :rules="[(val) => !!val || $t('common.required')]"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Save"
            color="primary"
            @click="updateThesisTitle"
            :loading="savingTitle"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useThesisStore } from 'src/stores/thesis/thesis'
import { useQuasar, Dialog } from 'quasar'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import MarkdownEditor from 'components/MarkdownEditor.vue'

const $q = useQuasar()
const thesisStore = useThesisStore()
const { t } = useI18n()

// State
const activeTab = ref('write')
const chapter = ref(null)
const content = ref('')
const saving = ref(false)
const generating = ref(false)
const loading = ref(false)
const aiSuggestions = ref('')
const feedbackHistory = ref([])
const showAIWriteDialog = ref(false)
const aiWriteType = ref(null)
const aiWritePrompt = ref('')
const showTitleEditor = ref(false)
const editedTitle = ref('')
const savingTitle = ref(false)

// Props
const props = defineProps({
  thesis: {
    type: Object,
    required: true,
  },
  chapters: {
    type: Array,
    default: () => [],
  },
})

// Emits
const emit = defineEmits(['chapter-saved', 'thesis-updated', 'back'])

// Computed
const completionProgress = computed(() => {
  const completedChapters = props.chapters.filter(
    (ch) => ch.content && ch.content.trim().length > 0,
  ).length
  return completedChapters / 5
})

const isThesisComplete = computed(() => {
  return (
    props.chapters.length === 5 &&
    props.chapters.every((chapter) => chapter.content && chapter.content.trim().length > 0)
  )
})

const aiWriteOptions = computed(() => {
  const chapterTypes = ['introduction', 'literature', 'methodology', 'results', 'conclusion']
  return chapterTypes.map((type, index) => ({
    label: t(`thesis.chapters.${index + 1}`),
    value: type,
    defaultPrompt: t(`thesis.ai.prompts.${type}`),
  }))
})

const parsedSuggestions = computed(() => {
  return parseFeedback(aiSuggestions.value)
})

// Watch
watch(aiWriteType, (newType) => {
  if (newType?.defaultPrompt) {
    aiWritePrompt.value = newType.defaultPrompt
  }
})

// Watch handlers
watch(
  () => chapter.value,
  (newChapter) => {
    if (newChapter) {
      const existingChapter = props.chapters.find((ch) => ch.chapter_number === newChapter)
      content.value = existingChapter?.content || ''
      aiSuggestions.value = ''
    }
  },
)

// Methods
async function selectChapter(num) {
  chapter.value = num
  const existingChapter = props.chapters.find((ch) => ch.chapter_number === num)
  content.value = existingChapter?.content || ''
  aiSuggestions.value = ''
}

function getStatusColor(status) {
  const colors = {
    draft: 'grey',
    submitted: 'blue',
    reviewed: 'orange',
    approved: 'positive',
  }
  return colors[status] || 'grey'
}

function getChapterStatusColor(chapterNum) {
  const chapter = props.chapters.find((ch) => ch.chapter_number === chapterNum)
  if (!chapter || !chapter.content) return 'grey'
  return chapter.content.trim().length > 0 ? 'positive' : 'grey'
}

function getChapterStatus(chapterNum) {
  const chapter = props.chapters.find((ch) => ch.chapter_number === chapterNum)
  if (!chapter || !chapter.content) return t('thesis.status.notStarted')
  return chapter.content.trim().length > 0
    ? t('thesis.status.complete')
    : t('thesis.status.inProgress')
}

function getChapterIcon(chapterNum) {
  const chapter = props.chapters.find((ch) => ch.chapter_number === chapterNum)
  if (!chapter || !chapter.content) return 'radio_button_unchecked'
  return chapter.content.trim().length > 0 ? 'check_circle' : 'edit'
}

function getMissingChaptersMessage() {
  const missing = [1, 2, 3, 4, 5].filter((num) => {
    const chapter = props.chapters.find((ch) => ch.chapter_number === num)
    return !chapter?.content || chapter.content.trim().length === 0
  })
  return t('thesis.warnings.missingChapters', { chapters: missing.join(', ') })
}

// Add parseFeedback function
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

// Add feedback history loading function
async function loadFeedbackHistory() {
  if (!props.thesis?.id) return
  loading.value = true
  try {
    const { data, error } = await thesisStore.fetchAIReviews(props.thesis.id)
    if (error) throw error
    feedbackHistory.value = data
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to load feedback history: ${error.message}`,
    })
  } finally {
    loading.value = false
  }
}

// Add missing function to use marked
function getChapterStructure(chapterNum) {
  const chapter = props.chapters.find((ch) => ch.chapter_number === chapterNum)
  if (!chapter?.content) return null
  try {
    return marked.parse(chapter.content.split('\n').slice(0, 5).join('\n'))
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return chapter.content.split('\n').slice(0, 5).join('\n')
  }
}

// ...rest of existing methods...

async function generateAIContent() {
  if (!aiWriteType.value || !aiWritePrompt.value || !chapter.value) {
    $q.notify({
      type: 'warning',
      message: t('thesis.ai.selectTypeAndPrompt'),
    })
    return
  }

  generating.value = true
  try {
    const currentChapter = chapter.value
    const currentChapterType = aiWriteOptions.value[currentChapter - 1]
    if (!currentChapterType) {
      throw new Error(t('thesis.ai.error.invalidChapter'))
    }

    const titleKeywords = props.thesis.title
      .toLowerCase()
      .split(/\W+/)
      .filter((term) => term.length > 3)
      .filter((term) => !['analysis', 'study', 'research', 'and', 'the'].includes(term))

    const contextPrompt = `
      Title Keywords: ${titleKeywords.join(', ')}
      Current Chapter: ${t(`thesis.chapters.${currentChapter}`)}
      Instructions:
      1. Focus content specifically on: ${props.thesis.title}
      2. Maintain consistent terminology with research variables
      3. Use academic language appropriate for ${currentChapterType.label}
      4. Include specific examples and citations related to the research topic
      5. Follow this structure:
      ${aiWritePrompt.value}
    `

    const response = await thesisStore.generateChapterContent({
      chapter: currentChapter,
      instructions: contextPrompt,
    })

    if (!response) {
      throw new Error(t('thesis.ai.error.noResponse'))
    }

    if (response.content) {
      if (content.value) {
        content.value += '\n\n' + response.content
      } else {
        content.value = response.content
      }

      if (response.canContinue) {
        showAIWriteDialog.value = false
        await new Promise((resolve) => setTimeout(resolve, 500))

        try {
          await Dialog.create({
            title: t('thesis.ai.continueGeneration.title'),
            message: t('thesis.ai.continueGeneration.confirmMessage').replace(
              '{n}',
              (response.iterationCount + 1).toString(),
            ),
            html: true,
            persistent: true,
            ok: {
              label: t('thesis.ai.continueGeneration.continue'),
              color: 'primary',
            },
            cancel: {
              label: t('thesis.ai.continueGeneration.stop'),
              color: 'grey',
            },
          })
            .onOk(async () => {
              const continuationContext = thesisStore.getCurrentGenerationContext()
              if (continuationContext) {
                await generateContinuation(continuationContext)
              }
            })
            .onCancel(() => {
              thesisStore.clearGenerationContext()
            })
        } catch (dialogError) {
          console.error('Dialog error:', dialogError)
        }
      } else {
        showAIWriteDialog.value = false
      }

      $q.notify({
        type: 'positive',
        message: t('thesis.ai.contentGenerated'),
      })
    } else {
      throw new Error(t('thesis.ai.error.emptyContent'))
    }
  } catch (error) {
    console.error('Content generation error:', error)
    $q.notify({
      type: 'negative',
      message: error.message || t('thesis.ai.error.generation'),
      timeout: 5000,
    })
  } finally {
    generating.value = false
  }
}

async function generateContinuation(context) {
  generating.value = true
  try {
    const response = await thesisStore.generateChapterContent({
      chapter: context.chapter,
      instructions: `Continue from: ${context.lastGeneratedContent.slice(-200)}...`,
      continuationContext: context,
    })

    if (response?.content) {
      // Add a visual separator between iterations
      const separator = `\n\n------- ${t('thesis.ai.continueGeneration.iterationProgress').replace('{n}', response.iterationCount)} -------\n\n`
      content.value += separator + response.content

      if (response.canContinue) {
        await Dialog.create({
          title: t('thesis.ai.continueGeneration.title'),
          message: t('thesis.ai.continueGeneration.confirmMessage').replace(
            '{n}',
            (response.iterationCount + 1).toString(),
          ),
          html: true,
          persistent: true,
          ok: {
            label: t('thesis.ai.continueGeneration.continue'),
            color: 'primary',
          },
          cancel: {
            label: t('thesis.ai.continueGeneration.stop'),
            color: 'grey',
          },
        })
          .onOk(async () => {
            const continuationContext = thesisStore.getCurrentGenerationContext()
            if (continuationContext) {
              await generateContinuation(continuationContext)
            }
          })
          .onCancel(() => {
            thesisStore.clearGenerationContext()
            $q.notify({
              type: 'positive',
              message: t('thesis.ai.contentContinued'),
            })
          })
      }
    }
  } catch (error) {
    console.error('Content continuation error:', error)
    $q.notify({
      type: 'negative',
      message: error.message || t('thesis.ai.error.continuation'),
      timeout: 5000,
    })
  } finally {
    generating.value = false
  }
}

async function onSubmit() {
  if (!chapter.value || !content.value) return
  saving.value = true
  try {
    await thesisStore.updateChapter(chapter.value, content.value)
    emit('chapter-saved')
    $q.notify({
      type: 'positive',
      message: t('thesis.ai.contentSaved'),
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('thesis.ai.error.save'),
    })
    console.error('Error saving chapter:', error)
  } finally {
    saving.value = false
  }
}

async function updateThesisTitle() {
  if (!editedTitle.value) return
  savingTitle.value = true
  try {
    await thesisStore.updateThesis(props.thesis.id, { title: editedTitle.value })
    showTitleEditor.value = false
    emit('thesis-updated')
    $q.notify({
      type: 'positive',
      message: t('thesis.titleUpdated'),
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: t('thesis.error.titleUpdate'),
    })
    console.error('Error updating title:', error)
  } finally {
    savingTitle.value = false
  }
}

function onAIWriteDialogOpen() {
  // Set initial write type based on current chapter
  if (chapter.value) {
    const currentChapter = chapter.value
    const chapterOption = {
      label: t(`thesis.chapters.${currentChapter}`),
      value: ['introduction', 'literature', 'methodology', 'results', 'conclusion'][
        currentChapter - 1
      ],
      defaultPrompt: t(
        `thesis.ai.prompts.${['introduction', 'literature', 'methodology', 'results', 'conclusion'][currentChapter - 1]}`,
      ),
    }

    aiWriteType.value = chapterOption
    aiWritePrompt.value = chapterOption.defaultPrompt || ''
  }
}

function onAIWriteDialogClose() {
  aiWriteType.value = null
  aiWritePrompt.value = ''
}

onMounted(async () => {
  // Initialize first chapter by default
  if (props.chapters?.length > 0) {
    const firstChapter = props.chapters[0]
    await selectChapter(firstChapter.chapter_number)
  }

  if (activeTab.value === 'history') {
    await loadFeedbackHistory()
  }
  editedTitle.value = props.thesis.title
})

watch(activeTab, (newTab) => {
  if (newTab === 'history') {
    loadFeedbackHistory()
  }
})
</script>
