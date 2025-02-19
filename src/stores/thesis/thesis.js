import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '../auth/auth'
import { useI18n } from 'vue-i18n'
import { Notify } from 'quasar'
import { supabase } from 'boot/supabase'
import { aiService } from 'src/services/ai'
import { useAIConfigStore } from '../ai/aiConfig'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

export const useThesisStore = defineStore('thesis', () => {
  // State
  const thesis = ref(null)
  const chapters = ref([])
  const aiReviews = ref([])
  const subscriptionsByThesis = new Map()
  const currentGenerationContext = ref(null)

  // Inject dependencies lazily
  const getAuthStore = () => useAuthStore()
  const getI18n = () => useI18n()
  const getAiConfig = () => useAIConfigStore()

  function showNotification(type, message) {
    Notify.create({
      type,
      message,
      timeout: 5000,
    })
  }

  async function retryWithBackoff(fn, retries = 0) {
    try {
      return await fn()
    } catch (error) {
      if ((error.status === 429 || error.status === 503) && retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)))
        return retryWithBackoff(fn, retries + 1)
      }
      throw error
    }
  }

  function cleanupThesisSubscriptions(thesisId) {
    const subs = subscriptionsByThesis.get(thesisId)
    if (subs) {
      subs.forEach((unsub) => unsub())
      subscriptionsByThesis.delete(thesisId)
    }
  }

  function initializeSubscriptions(thesisId) {
    // Cleanup existing subscriptions for this thesis
    cleanupThesisSubscriptions(thesisId)

    const subscriptions = []

    // Subscribe to thesis changes
    const thesisSubscription = supabase
      .channel(`thesis-${thesisId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'theses',
          filter: `id=eq.${thesisId}`,
        },
        (payload) => {
          if (payload.new && thesis.value?.id === thesisId) {
            thesis.value = { ...thesis.value, ...payload.new }
          }
        },
      )
      .subscribe()

    subscriptions.push(() => thesisSubscription.unsubscribe())

    // Subscribe to chapter changes
    const chaptersSubscription = supabase
      .channel(`chapters-${thesisId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chapters',
          filter: `thesis_id=eq.${thesisId}`,
        },
        (payload) => {
          if (thesis.value?.id !== thesisId) return

          if (payload.eventType === 'INSERT') {
            chapters.value.push(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            const index = chapters.value.findIndex((c) => c.id === payload.new.id)
            if (index !== -1) {
              chapters.value[index] = payload.new
            }
          }
        },
      )
      .subscribe()

    subscriptions.push(() => chaptersSubscription.unsubscribe())

    // Store subscriptions for cleanup
    subscriptionsByThesis.set(thesisId, subscriptions)
  }

  async function fetchThesis(thesisId) {
    try {
      const { data, error } = await supabase
        .from('theses')
        .select('*, chapters(*)')
        .eq('id', thesisId)
        .single()

      if (error) throw error

      thesis.value = data
      chapters.value = data.chapters || []

      // Initialize realtime subscriptions for this thesis
      initializeSubscriptions(thesisId)

      return data
    } catch (error) {
      console.error('Error fetching thesis:', error)
      throw error
    }
  }

  async function fetchAllTheses() {
    try {
      let query = supabase.from('theses').select('*, profiles(full_name)')

      const authStore = getAuthStore()
      if (authStore.isAuthenticated && authStore.isStudent) {
        query = query.eq('student_id', authStore.user?.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching theses:', error)
      throw error
    }
  }

  async function createThesis(title) {
    try {
      const authStore = getAuthStore()
      const { data, error } = await supabase
        .from('theses')
        .insert([
          {
            title,
            student_id: authStore.user?.id,
            status: 'draft',
          },
        ])
        .select()
        .single()

      if (error) throw error
      thesis.value = data
      return data
    } catch (error) {
      console.error('Error creating thesis:', error)
      throw error
    }
  }

  async function updateChapter(chapterNumber, content) {
    if (!thesis.value) {
      throw new Error('No active thesis found')
    }

    try {
      // First check if chapter exists
      const existingChapter = chapters.value.find((c) => c.chapter_number === chapterNumber)

      const chapterData = {
        thesis_id: thesis.value.id,
        chapter_number: chapterNumber,
        content,
        last_updated: new Date().toISOString(),
      }

      let query = supabase.from('chapters')
      if (existingChapter) {
        query = query.update(chapterData).eq('id', existingChapter.id)
      } else {
        query = query.insert([chapterData])
      }

      const { data, error } = await query.select().single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Akses ditolak. Pastikan Anda memiliki izin untuk menyimpan bab.')
        }
        throw error
      }

      const index = chapters.value.findIndex((c) => c.chapter_number === chapterNumber)
      if (index !== -1) {
        chapters.value[index] = data
      } else {
        chapters.value.push(data)
      }

      return data
    } catch (error) {
      console.error('Error updating chapter:', error)
      throw new Error(`Gagal menyimpan bab: ${error.message}`)
    }
  }

  async function saveAIReview(chapterId, review) {
    try {
      const { data, error } = await supabase
        .from('ai_reviews')
        .insert([
          {
            chapter_id: chapterId,
            review_content: review,
            reviewed_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error saving AI review:', error)
      throw error
    }
  }

  async function updateThesisStatus(thesisId, status) {
    try {
      const { data, error } = await supabase
        .from('theses')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', thesisId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating thesis status:', error)
      throw error
    }
  }

  async function handleAIError(error, defaultMessage) {
    const i18n = getI18n()
    const currentLocale = i18n.global.locale.value
    let errorMessage = defaultMessage

    if (error.message?.includes('invalid_request_error')) {
      errorMessage =
        currentLocale === 'id-ID'
          ? 'Format permintaan tidak valid. Silakan coba lagi.'
          : 'Invalid request format. Please try again.'
    } else if (error.message?.includes('context_length_exceeded')) {
      errorMessage =
        currentLocale === 'id-ID'
          ? 'Konten terlalu panjang. Silakan ringkas atau bagi menjadi beberapa bagian.'
          : 'Content is too long. Please summarize or split into sections.'
    } else if (error.status === 429) {
      errorMessage =
        currentLocale === 'id-ID'
          ? 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.'
          : 'Too many requests. Please try again in a few moments.'
    } else if (error.status === 401) {
      errorMessage =
        currentLocale === 'id-ID'
          ? 'Kunci API tidak valid. Silakan periksa konfigurasi Anda.'
          : 'Invalid API key. Please check your configuration.'
    } else if (error.status === 503) {
      errorMessage =
        currentLocale === 'id-ID'
          ? 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.'
          : 'Service temporarily unavailable. Please try again later.'
    }

    showNotification('negative', errorMessage)
    throw error
  }

  async function analyzeThesis(content, chapterNumber) {
    try {
      return await retryWithBackoff(async () => {
        const thesisData = thesis.value
        const allChapters = chapters.value
        const i18n = getI18n()
        const currentLocale = i18n.global.locale.value
        const systemPrompt =
          currentLocale === 'id-ID'
            ? `Anda adalah peninjau skripsi yang menganalisis Bab ${chapterNumber} dari skripsi berjudul "${thesisData.title}".

             Konteks dari bab-bab sebelumnya:
             ${allChapters
               .filter((ch) => ch.chapter_number < chapterNumber)
               .map((ch) => `Bab ${ch.chapter_number}: ${ch.content?.substring(0, 200)}...`)
               .join('\n')}

             Berikan umpan balik akademis yang detail mengenai:
             1. Kesesuaian dengan judul dan tujuan penelitian
                - Apakah konten membahas secara spesifik variabel penelitian?
                - Apakah pembahasan terfokus pada topik utama?

             2. Ketelitian akademik dan metodologi
                - Apakah metodologi sesuai dengan variabel penelitian?
                - Apakah analisis mendalam dan spesifik?

             3. Penggunaan sitasi dan referensi
                - Apakah referensi relevan dengan topik spesifik?
                - Apakah sumber-sumber mutakhir dan berkualitas?

             4. Bahasa dan gaya penulisan akademis
                - Apakah terminologi sesuai bidang penelitian?
                - Apakah argumentasi didukung data spesifik?

             5. Rekomendasi spesifik untuk perbaikan
                - Berikan saran konkret terkait topik penelitian
                - Identifikasi area yang membutuhkan pendalaman

             Hindari umpan balik yang terlalu umum. Fokus pada aspek spesifik dari penelitian ini.`
            : `You are a thesis reviewer analyzing Chapter ${chapterNumber} of a thesis titled "${thesisData.title}".

             Context from previous chapters:
             ${allChapters
               .filter((ch) => ch.chapter_number < chapterNumber)
               .map((ch) => `Chapter ${ch.chapter_number}: ${ch.content?.substring(0, 200)}...`)
               .join('\n')}

             Provide detailed academic feedback addressing:
             1. Alignment with thesis title and objectives
                - Does the content specifically address research variables?
                - Is the discussion focused on the main topic?

             2. Academic rigor and methodology
                - Is the methodology appropriate for the research variables?
                - Is the analysis thorough and specific?

             3. Citation and reference usage
                - Are references relevant to the specific topic?
                - Are sources current and authoritative?

             4. Academic language and writing style
                - Is terminology appropriate for the field?
                - Are arguments supported by specific data?

             5. Specific recommendations for improvement
                - Provide concrete suggestions related to research topic
                - Identify areas needing deeper exploration

             Avoid generic feedback. Focus on specific aspects of this research.`

        const response = await aiService.chat(
          [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content,
            },
          ],
          {
            temperature: 0.7,
            max_tokens: 1500,
            presence_penalty: 0.2,
            frequency_penalty: 0.3,
          },
          getAiConfig().getCurrentConfig(),
        )
        return response
      })
    } catch (error) {
      const i18n = getI18n()
      return handleAIError(error, i18n.global.t('thesis.ai.error.analysis'))
    }
  }

  async function generateSuggestions(prompt, chapterNumber) {
    try {
      const i18n = getI18n()
      const systemPrompt =
        i18n.global.locale.value === 'id-ID'
          ? `Anda adalah asisten penulisan skripsi yang membantu dengan Bab ${chapterNumber}.
             Berikan saran konstruktif untuk:
             1. Pengembangan dan kedalaman konten
             2. Struktur dan alur
             3. Peningkatan bahasa akademis
             4. Arah penelitian
             5. Area potensial untuk pengembangan

             Berikan rekomendasi yang spesifik dan dapat ditindaklanjuti.
             Gunakan bahasa Indonesia formal dan akademis.`
          : `You are a thesis writing assistant helping with Chapter ${chapterNumber}.
             Provide constructive suggestions for:
             1. Content development and depth
             2. Structure and flow
             3. Academic language enhancement
             4. Research direction
             5. Potential areas for expansion

             Be specific and actionable in your recommendations.
             Use formal academic language.`

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ]

      return await aiService.chat(
        messages,
        {
          temperature: 0.7,
          max_tokens: 1500,
          presence_penalty: 0.2,
          frequency_penalty: 0.3,
        },
        getAiConfig().getCurrentConfig(),
      )
    } catch (error) {
      const i18n = getI18n()
      return handleAIError(error, i18n.global.t('thesis.ai.error.suggestions'))
    }
  }

  async function fetchAIReviews(thesisId) {
    try {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id')
        .eq('thesis_id', thesisId)

      const chapterIds = chapters.map((c) => c.id)

      const { data, error } = await supabase
        .from('ai_reviews')
        .select(
          `
          *,
          chapters!inner(
            chapter_number,
            thesis_id
          )
        `,
        )
        .in('chapter_id', chapterIds)
        .order('reviewed_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching AI reviews:', error)
      return { data: null, error }
    }
  }

  async function validateThesisCompletion(thesisId) {
    try {
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('chapter_number, content')
        .eq('thesis_id', thesisId)

      if (error) throw error

      // Check if all chapters 1-5 exist and have content
      const isComplete = [1, 2, 3, 4, 5].every((num) =>
        chapters.some(
          (ch) => ch.chapter_number === num && ch.content && ch.content.trim().length > 0,
        ),
      )

      return { isComplete, error: null }
    } catch (error) {
      console.error('Error validating thesis completion:', error)
      return { isComplete: false, error }
    }
  }

  async function generateChapterStructure(title, researchDescription) {
    try {
      return await retryWithBackoff(async () => {
        const response = await aiService.chat(
          [
            {
              role: 'system',
              content: `As an academic research advisor, generate a detailed chapter structure for a thesis titled "${title}".
              Each chapter should follow standard academic thesis structure and include:
              1. Clear objectives for each chapter
              2. Detailed sub-sections with their content expectations
              3. Research methodology guidelines
              4. Data analysis frameworks
              5. Expected outcomes

              Format your response as JSON with:
              {
                "chapters": [
                  {
                    "number": chapterNumber,
                    "title": "Chapter title",
                    "sections": [
                      {
                        "title": "Section title",
                        "content": "Detailed description of what should be included"
                      }
                    ]
                  }
                ]
              }`,
            },
            {
              role: 'user',
              content: researchDescription,
            },
          ],
          {
            temperature: 0.7,
            max_tokens: 2000,
          },
          getAiConfig().getCurrentConfig(),
        )
        return JSON.parse(response)
      })
    } catch (error) {
      console.error('Error generating chapter structure:', error)
      throw error
    }
  }

  async function enrichWithScientificReferences(content, field) {
    try {
      const systemPrompt = `As an academic reference specialist in ${field}, enhance this content with relevant scientific references.
        For each main point, suggest:
        1. Recent peer-reviewed journal articles (past 5 years preferred)
        2. Highly-cited papers in the field
        3. Relevant theoretical frameworks
        4. Methodological references

        Format: Keep existing content but add relevant in-text citations and complete reference list.`

      const response = await aiService.chat(
        [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        {
          temperature: 0.6,
          max_tokens: 2000,
        },
        getAiConfig().getCurrentConfig(),
      )

      return response
    } catch (error) {
      console.error('Error enriching references:', error)
      return content
    }
  }

  async function generateChapterContent({ chapter, instructions, continuationContext = null }) {
    try {
      const config = await getAiConfig().ensureValidConfig()

      const messages = [
        {
          role: 'system',
          content:
            'You are an academic writing assistant specializing in thesis content generation.',
        },
      ]

      if (continuationContext) {
        messages.push({
          role: 'system',
          content: `This is a continuation of previous content. Context: ${continuationContext.lastGeneratedContent.slice(-500)}...
Keep the same style and flow while expanding on the topic. Continue the depth of discussion and development of ideas.`,
        })
      }

      messages.push({
        role: 'user',
        content: instructions,
      })

      const response = await retryWithBackoff(async () => {
        return await aiService.chat(
          messages,
          {
            temperature: 0.7,
            max_tokens: 2000,
            presence_penalty: 0.2,
            frequency_penalty: 0.3,
          },
          config,
        )
      })

      if (!response) {
        throw new Error('AI service did not return any content')
      }

      // Using word count instead of character length for better content measurement
      const wordCount = response.split(/\s+/).length
      const needsContinuation = wordCount >= 300 // Approximate threshold for academic writing section

      currentGenerationContext.value = needsContinuation
        ? {
            chapter,
            lastGeneratedContent: response,
            continuationPoint: response.length,
            iterationCount: (continuationContext?.iterationCount || 0) + 1,
            totalWords: (continuationContext?.totalWords || 0) + wordCount,
          }
        : null

      return {
        content: response,
        canContinue: needsContinuation,
        iterationCount: currentGenerationContext.value?.iterationCount || 1,
        wordCount,
        totalWords: currentGenerationContext.value?.totalWords || wordCount,
      }
    } catch (error) {
      console.error('Error in generateChapterContent:', error)
      if (error.message.includes('API key')) {
        throw new Error(getI18n().t('thesis.ai.error.apiKey'))
      }
      throw error
    }
  }

  function getCurrentGenerationContext() {
    return currentGenerationContext.value
  }

  function clearGenerationContext() {
    currentGenerationContext.value = null
  }

  function validateAndEnhanceContent(content, thesisTitle) {
    // Extract key terms from thesis title
    const titleTerms = thesisTitle
      .toLowerCase()
      .split(/\W+/)
      .filter((term) => term.length > 3)
      .filter((term) => !['analysis', 'study', 'research', 'and', 'the'].includes(term))

    // Validate academic structure
    const requiredSections = {
      introduction:
        content.toLowerCase().includes('# introduction') ||
        content.toLowerCase().includes('## introduction'),
      methodology:
        content.toLowerCase().includes('methodology') || content.toLowerCase().includes('methods'),
      discussion:
        content.toLowerCase().includes('discussion') || content.toLowerCase().includes('analysis'),
      references:
        content.toLowerCase().includes('references') ||
        content.toLowerCase().includes('bibliography'),
    }

    let enhancedContent = content

    // Ensure content focuses on thesis topic
    if (!titleTerms.some((term) => content.toLowerCase().includes(term))) {
      const topicContext = `This section specifically addresses ${titleTerms.join(', ')} in the context of the research objectives. `
      enhancedContent = topicContext + enhancedContent
    }

    // Ensure proper academic structure
    if (!requiredSections.references) {
      enhancedContent += '\n\n## References\n'
    }

    // Validate citation format
    const hasCitations = /\([A-Za-z]+,\s*\d{4}\)/.test(content) || /\[[\d,\s]+\]/.test(content)
    if (!hasCitations) {
      enhancedContent +=
        '\n\nNote: This section requires additional academic citations to support the arguments presented.'
    }

    // Ensure section linking
    if (
      !content.includes('as discussed in the previous section') &&
      !content.includes('as mentioned earlier') &&
      !content.includes('building upon')
    ) {
      enhancedContent = enhancedContent.replace(
        /^(#+ .*?\n)/,
        '$1\nBuilding upon the previous discussions, this section examines ',
      )
    }

    return enhancedContent
  }

  async function generateResearchSuggestions(interests, field) {
    try {
      return await retryWithBackoff(async () => {
        const response = await aiService.chat(
          [
            {
              role: 'system',
              content: `As a research advisor in ${field}, suggest potential thesis topics based on the student's interests.
              Consider:
              1. Current research trends
              2. Academic value
              3. Feasibility for thesis scope
              4. Research gap in the field
              5. Available resources and methodologies

              Format your response as JSON with:
              {
                "topics": [
                  {
                    "title": "Research title",
                    "description": "Brief description",
                    "methodology": "Suggested research method",
                    "impact": "Potential impact",
                    "keywords": ["keyword1", "keyword2"]
                  }
                ]
              }`,
            },
            {
              role: 'user',
              content: interests,
            },
          ],
          {
            temperature: 0.7,
          },
          getAiConfig().getCurrentConfig(),
        )
        return JSON.parse(response)
      })
    } catch (error) {
      console.error('Error generating research suggestions:', error)
      throw error
    }
  }

  async function generateTopics(field, interests) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a research advisor specializing in ${field}.`,
        },
        {
          role: 'user',
          content: `Generate 3 specific thesis topics based on these interests: ${interests}`,
        },
      ]

      return await aiService.chat(
        messages,
        {
          temperature: 0.7,
          max_tokens: 1500,
        },
        getAiConfig().getCurrentConfig(),
      )
    } catch (error) {
      console.error('Error generating topics:', error)
      throw error
    }
  }

  async function updateThesis(thesisId, updates) {
    try {
      const { data, error } = await supabase
        .from('theses')
        .update(updates)
        .eq('id', thesisId)
        .select()
        .single()

      if (error) throw error

      if (thesis.value?.id === thesisId) {
        thesis.value = { ...thesis.value, ...updates }
      }

      return data
    } catch (error) {
      console.error('Error updating thesis:', error)
      throw error
    }
  }

  function cleanup() {
    if (thesis.value?.id) {
      cleanupThesisSubscriptions(thesis.value.id)
    }
    thesis.value = null
    chapters.value = []
    aiReviews.value = []
  }

  return {
    // State
    thesis,
    chapters,
    aiReviews,

    // Actions
    fetchThesis,
    fetchAllTheses,
    createThesis,
    updateChapter,
    updateThesis,
    analyzeThesis,
    generateSuggestions,
    saveAIReview,
    updateThesisStatus,
    fetchAIReviews,
    validateThesisCompletion,
    initializeSubscriptions,
    cleanup,
    generateChapterStructure,
    generateChapterContent,
    generateResearchSuggestions,
    generateTopics,
    handleAIError,
    getCurrentGenerationContext,
    clearGenerationContext,
    enrichWithScientificReferences,
    validateAndEnhanceContent,
  }
})
