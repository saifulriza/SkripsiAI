<template>
  <div class="markdown-editor-container">
    <div class="toolbar" v-if="$slots.before">
      <slot name="before"></slot>
    </div>
    <div class="editor-wrapper">
      <textarea
        ref="editor"
        class="content-editable"
        :value="modelValue"
        @input="handleInput"
        @keydown="handleKeydown"
        :placeholder="'Start typing...'"
      ></textarea>
      <div class="preview markdown-preview" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Content (Markdown)',
  },
})

const emit = defineEmits(['update:modelValue'])
const editor = ref(null)

const renderedContent = computed(() => {
  try {
    if (!props.modelValue) return ''
    return marked.parse(props.modelValue)
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return props.modelValue
  }
})

function handleInput(e) {
  emit('update:modelValue', e.target.value)
}

function handleKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const start = e.target.selectionStart
    const end = e.target.selectionEnd
    const value = e.target.value
    e.target.value = value.substring(0, start) + '  ' + value.substring(end)
    e.target.selectionStart = e.target.selectionEnd = start + 2
    handleInput(e)
  }
}
</script>

<style scoped>
.markdown-editor-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.toolbar {
  padding: 8px;
  border-bottom: 1px solid #ddd;
  background: #f7f7f7;
}

.editor-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
}

.content-editable {
  min-height: 300px;
  padding: 1rem;
  outline: none;
  overflow-y: auto;
  line-height: 1.6;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  resize: none;
}

.preview {
  min-height: 300px;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-y: auto;
}

.markdown-preview :deep(h1) {
  font-size: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-preview :deep(h2) {
  font-size: 1.25rem;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.markdown-preview :deep(p) {
  margin-bottom: 0.5rem;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.markdown-preview :deep(code) {
  background: #e0e0e0;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-preview :deep(pre) {
  background: #e0e0e0;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid #ccc;
  margin-left: 0;
  padding-left: 1rem;
  color: #666;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1rem;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.markdown-preview :deep(th) {
  background-color: #f5f5f5;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
