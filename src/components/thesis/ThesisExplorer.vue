<template>
  <div class="thesis-explorer q-pa-md">
    <q-card class="exploration-card">
      <q-card-section>
        <div class="text-h6">Research Topic Explorer</div>
        <p class="text-subtitle2">Discover and refine your thesis topic with AI assistance</p>

        <!-- Research Interest Input -->
        <q-input
          v-model="researchInterests"
          type="textarea"
          label="Describe your research interests"
          hint="What topics interest you? What problems would you like to solve?"
          filled
          autogrow
          class="q-mb-md"
        />

        <!-- Field Selection -->
        <q-select
          v-model="selectedField"
          :options="fieldOptions"
          label="Field of Study"
          filled
          class="q-mb-md"
        />

        <div class="row q-gutter-md">
          <q-btn
            color="primary"
            icon="psychology"
            label="Generate Topic Suggestions"
            @click="generateTopics"
            :loading="generating"
          />
        </div>
      </q-card-section>

      <!-- Generated Topics -->
      <q-card-section v-if="suggestedTopics.length > 0">
        <div class="text-h6 q-mb-md">Suggested Topics</div>
        <div class="row q-col-gutter-md">
          <div v-for="(topic, index) in suggestedTopics" :key="index" class="col-12">
            <q-card flat bordered class="topic-card">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold">{{ topic.title }}</div>
                <p class="q-mt-sm">{{ topic.description }}</p>

                <div class="text-caption q-mt-md">
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-6">
                      <strong>Methodology:</strong>
                      <p>{{ topic.methodology }}</p>
                    </div>
                    <div class="col-12 col-md-6">
                      <strong>Key Variables:</strong>
                      <p>{{ topic.variables.join(', ') }}</p>
                    </div>
                  </div>
                  <div class="q-mt-sm">
                    <strong>Feasibility:</strong>
                    <p>{{ topic.feasibility }}</p>
                  </div>
                </div>

                <div class="row justify-between items-center q-mt-md">
                  <div>
                    <q-chip
                      v-for="(tag, tagIndex) in topic.tags"
                      :key="tagIndex"
                      size="sm"
                      color="primary"
                      text-color="white"
                    >
                      {{ tag }}
                    </q-chip>
                  </div>
                  <q-btn flat color="primary" label="Select Topic" @click="selectTopic(topic)" />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Chapter Structure Dialog -->
    <q-dialog v-model="showStructureDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Chapter Structure</div>
          <div class="text-subtitle2">{{ selectedTopic?.title }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div v-for="(chapter, index) in chapterStructure" :key="index" class="q-mb-md">
            <div class="text-subtitle1 text-weight-bold">{{ chapter.title }}</div>
            <MarkdownEditor v-model="chapter.content" :label="`Chapter ${index + 1} Content`" />
            <div v-for="(subSection, subIndex) in chapter.sections" :key="subIndex" class="q-ml-md">
              <div class="text-body1">{{ subSection.title }}</div>
              <p class="text-caption q-ml-md">{{ subSection.description }}</p>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Back" color="primary" v-close-popup />
          <q-btn flat label="Create Thesis" color="primary" @click="createThesisWithStructure" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useThesisStore } from 'src/stores/thesis/thesis'
import { OpenAI } from 'openai'
import MarkdownEditor from 'components/MarkdownEditor.vue'

const props = defineProps({
  onThesisCreated: {
    type: Function,
    required: true,
  },
})

const $q = useQuasar()
const thesisStore = useThesisStore()
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

const researchInterests = ref('')
const selectedField = ref(null)
const generating = ref(false)
const suggestedTopics = ref([])
const selectedTopic = ref(null)
const showStructureDialog = ref(false)
const chapterStructure = ref([])

const fieldOptions = [
  'Computer Science',
  'Information Systems',
  'Data Science',
  'Software Engineering',
  'Artificial Intelligence',
  'Information Technology',
]

async function generateTopics() {
  if (!researchInterests.value || !selectedField.value) {
    $q.notify({
      type: 'warning',
      message: 'Please provide your research interests and select a field of study',
    })
    return
  }

  generating.value = true
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a research advisor specializing in ${selectedField.value}.
            Generate 3 specific and focused thesis topics based on the student's interests.
            Each topic must be:
            1. Highly specific to the research domain
            2. Include clear research variables or focus areas
            3. Have measurable outcomes
            4. Be academically valuable and novel
            5. Suitable for thesis-level research

            Format the response as a JSON array with objects containing:
            - title: A specific, well-defined thesis title
            - description: Detailed description including research gap and significance
            - methodology: Suggested research methodology
            - variables: Key variables or aspects to study
            - tags: Array of relevant keywords
            - feasibility: Assessment of completion feasibility

            Ensure the topics are highly focused and avoid generic suggestions.`,
        },
        {
          role: 'user',
          content: researchInterests.value,
        },
      ],
      temperature: 0.7,
    })

    const suggestions = JSON.parse(response.choices[0].message.content)
    suggestedTopics.value = suggestions.map((topic) => ({
      ...topic,
      title: validateAndEnhanceTitle(topic.title),
    }))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to generate topic suggestions. Please try again.',
    })
    console.error('Error generating topics:', error)
  } finally {
    generating.value = false
  }
}

// Add new function to validate and enhance titles
function validateAndEnhanceTitle(title) {
  // Check if title is too generic
  const genericPhrases = ['research about', 'study of', 'analysis of', 'investigation of']
  let enhancedTitle = title

  // Remove generic phrases
  genericPhrases.forEach((phrase) => {
    const regex = new RegExp(`^${phrase}\\s+`, 'i')
    enhancedTitle = enhancedTitle.replace(regex, '')
  })

  // Ensure title includes specific elements
  if (
    !enhancedTitle.match(
      /\b(impact|effect|relationship|influence|implementation|development|analysis)\b/i,
    )
  ) {
    enhancedTitle = `Analysis of ${enhancedTitle}`
  }

  return enhancedTitle
}

async function selectTopic(topic) {
  selectedTopic.value = topic
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Generate a detailed chapter structure for a thesis titled "${topic.title}".
            Your response must be a valid JSON string in the following format:
            {
              "chapters": [
                {
                  "title": "Chapter Title",
                  "sections": [
                    {
                      "title": "Section Title",
                      "description": "Section description"
                    }
                  ]
                }
              ]
            }

            Include exactly 5 chapters following standard academic thesis structure.
            Ensure the response is properly formatted JSON with no trailing commas.`,
        },
      ],
      temperature: 0.7,
    })

    try {
      const parsedContent = JSON.parse(response.choices[0].message.content.trim())
      if (!parsedContent.chapters || !Array.isArray(parsedContent.chapters)) {
        throw new Error('Invalid response structure')
      }

      chapterStructure.value = parsedContent.chapters.map((chapter) => ({
        ...chapter,
        content: formatChapterContent(chapter),
      }))
      showStructureDialog.value = true
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      $q.notify({
        type: 'negative',
        message: 'Failed to process the AI response. Please try again.',
      })
    }
  } catch (error) {
    console.error('Error generating structure:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to generate chapter structure. Please try again.',
    })
  }
}

async function createThesisWithStructure() {
  try {
    await thesisStore.createThesis(selectedTopic.value.title)

    // Create chapters with their edited content
    for (const [index, chapter] of chapterStructure.value.entries()) {
      await thesisStore.updateChapter(index + 1, chapter.content)
    }

    showStructureDialog.value = false
    $q.notify({
      type: 'positive',
      message: 'Thesis created successfully with generated structure',
    })

    if (props.onThesisCreated) {
      props.onThesisCreated()
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to create thesis. Please try again.',
    })
    console.error('Error creating thesis:', error)
  }
}

function formatChapterContent(chapter) {
  let content = `# ${chapter.title}\n\n`
  chapter.sections.forEach((section) => {
    content += `## ${section.title}\n${section.description}\n\n`
  })
  return content
}
</script>

<style scoped>
.thesis-explorer {
  max-width: 1200px;
  margin: 0 auto;
}

.topic-card {
  transition: all 0.3s ease;
}

.topic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.markdown-editor {
  width: 100%;
  min-height: 300px;
}

.markdown-preview {
  width: 100%;
  min-height: 300px;
  background: #f5f5f5;
  border-radius: 4px;
}

.preview-content {
  width: 100%;
  overflow-y: auto;
  max-height: 500px;
}

.preview-content :deep(h1) {
  font-size: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.preview-content :deep(h2) {
  font-size: 1.25rem;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.preview-content :deep(p) {
  margin-bottom: 0.5rem;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.preview-content :deep(code) {
  background: #e0e0e0;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

.preview-content :deep(pre) {
  background: #e0e0e0;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid #ccc;
  margin-left: 0;
  padding-left: 1rem;
  color: #666;
}
</style>
