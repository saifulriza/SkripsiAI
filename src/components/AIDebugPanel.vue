<template>
  <q-dialog v-model="isOpen" maximized>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">AI Request Logs</div>
        <q-space />
        <q-btn icon="help" flat round dense class="q-mr-sm">
          <q-tooltip>
            Shows model usage and API request history. Token usage helps track model capacity and
            costs.
          </q-tooltip>
        </q-btn>
        <q-btn icon="refresh" flat round dense @click="refreshLogs" />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pa-none">
        <div class="row q-pa-md items-center">
          <q-select
            v-model="filterProvider"
            :options="providers"
            label="Filter Provider"
            clearable
            class="col-3 q-mr-md"
            dense
          />
          <q-select
            v-model="filterModel"
            :options="models"
            label="Filter Model"
            clearable
            class="col-3 q-mr-md"
            dense
          />
          <q-btn flat color="primary" label="Clear Filters" @click="clearFilters" class="q-mr-md" />
          <q-space />
          <div class="text-caption text-grey">Total Requests: {{ filteredLogs.length }}</div>
        </div>

        <q-table :rows="filteredLogs" :columns="columns" row-key="timestamp" dense>
          <template v-slot:body="props">
            <q-tr :props="props" :class="{ 'bg-red-1': props.row.error }">
              <q-td key="timestamp" :props="props">
                {{ new Date(props.row.timestamp).toLocaleString() }}
              </q-td>
              <q-td key="provider" :props="props">{{ props.row.provider }}</q-td>
              <q-td key="model" :props="props">{{ props.row.model }}</q-td>
              <q-td key="status" :props="props">
                <q-chip :color="getStatusColor(props.row.status)" text-color="white" dense>
                  {{ props.row.status }}
                </q-chip>
              </q-td>
              <q-td key="tokens" :props="props">
                <template v-if="props.row.totalTokens">
                  <div class="row items-center">
                    <div class="col">
                      {{ props.row.totalTokens }}
                      <q-tooltip>
                        Prompt: {{ props.row.promptTokens }}<br />
                        Completion: {{ props.row.completionTokens }}
                      </q-tooltip>
                    </div>
                    <div class="col-8">
                      <q-linear-progress
                        :value="props.row.tokenUsagePercentage / 100"
                        :color="getTokenUsageColor(props.row.tokenUsagePercentage)"
                        class="q-ml-sm"
                      >
                        <q-tooltip
                          >{{ props.row.tokenUsagePercentage }}% of model capacity</q-tooltip
                        >
                      </q-linear-progress>
                    </div>
                  </div>
                </template>
                <span v-else>-</span>
              </q-td>
              <q-td key="duration" :props="props"> {{ props.row.duration }}ms </q-td>
              <q-td key="actions" :props="props">
                <q-btn-group flat>
                  <q-btn
                    size="sm"
                    flat
                    round
                    color="primary"
                    icon="visibility"
                    @click="viewDetails(props.row)"
                  >
                    <q-tooltip>View Details</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="props.row.error"
                    size="sm"
                    flat
                    round
                    color="negative"
                    icon="refresh"
                    @click="retryRequest(props.row)"
                  >
                    <q-tooltip>Retry Request</q-tooltip>
                  </q-btn>
                </q-btn-group>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Export Logs" color="primary" @click="exportLogs" />
        <q-btn flat label="Clear Logs" color="negative" @click="clearLogs" />
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>

    <!-- Details Dialog -->
    <q-dialog v-model="showDetails">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Request Details</div>
        </q-card-section>

        <q-card-section>
          <q-tabs v-model="detailsTab">
            <q-tab name="request" label="Request" />
            <q-tab name="response" label="Response" />
            <q-tab name="error" label="Error" v-if="selectedRequest?.error" />
            <q-tab name="metrics" label="Metrics" v-if="selectedRequest?.totalTokens" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="detailsTab" animated>
            <q-tab-panel name="request">
              <pre class="code-block">{{ JSON.stringify(selectedRequest?.options, null, 2) }}</pre>
            </q-tab-panel>
            <q-tab-panel name="response">
              <pre class="code-block">{{ selectedRequest?.response || 'No response' }}</pre>
            </q-tab-panel>
            <q-tab-panel name="error" v-if="selectedRequest?.error">
              <pre class="code-block text-negative">{{
                JSON.stringify(selectedRequest?.error, null, 2)
              }}</pre>
            </q-tab-panel>
            <q-tab-panel name="metrics" v-if="selectedRequest?.totalTokens">
              <div class="row q-col-gutter-md">
                <div class="col-12">
                  <q-card flat bordered>
                    <q-card-section>
                      <div class="text-subtitle2">Token Usage</div>
                      <q-list dense>
                        <q-item>
                          <q-item-section>Prompt Tokens</q-item-section>
                          <q-item-section side>{{ selectedRequest.promptTokens }}</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>Completion Tokens</q-item-section>
                          <q-item-section side>{{
                            selectedRequest.completionTokens
                          }}</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>Total Tokens</q-item-section>
                          <q-item-section side>{{ selectedRequest.totalTokens }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-12">
                  <q-card flat bordered>
                    <q-card-section>
                      <div class="text-subtitle2">Performance</div>
                      <q-list dense>
                        <q-item>
                          <q-item-section>Response Time</q-item-section>
                          <q-item-section side>{{ selectedRequest.duration }}ms</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>Model Capacity Usage</q-item-section>
                          <q-item-section side
                            >{{ selectedRequest.tokenUsagePercentage }}%</q-item-section
                          >
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { aiService } from 'src/services/ai'
import { useAIConfigStore } from 'src/stores/ai/aiConfig'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue'])
const $q = useQuasar()
const aiConfig = useAIConfigStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// State
const filterProvider = ref(null)
const filterModel = ref(null)
const showDetails = ref(false)
const selectedRequest = ref(null)
const detailsTab = ref('request')

// Computed
const providers = computed(() => [...new Set(aiService.getRequestLog().map((log) => log.provider))])

const models = computed(() => [...new Set(aiService.getRequestLog().map((log) => log.model))])

const filteredLogs = computed(() => {
  let logs = aiService.getRequestLog()
  if (filterProvider.value) {
    logs = logs.filter((log) => log.provider === filterProvider.value)
  }
  if (filterModel.value) {
    logs = logs.filter((log) => log.model === filterModel.value)
  }
  return logs
})

const columns = [
  { name: 'timestamp', label: 'Time', field: 'timestamp', sortable: true },
  { name: 'provider', label: 'Provider', field: 'provider', sortable: true },
  { name: 'model', label: 'Model', field: 'model', sortable: true },
  { name: 'status', label: 'Status', field: 'status', sortable: true },
  { name: 'tokens', label: 'Tokens', field: 'totalTokens', sortable: true },
  { name: 'duration', label: 'Duration', field: 'duration', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions' },
]

function getStatusColor(status) {
  switch (status) {
    case 'success':
      return 'positive'
    case 'error':
      return 'negative'
    case 'pending':
      return 'grey'
    default:
      return 'grey'
  }
}

function getTokenUsageColor(percentage) {
  if (percentage > 90) return 'negative'
  if (percentage > 70) return 'warning'
  return 'positive'
}

function clearFilters() {
  filterProvider.value = null
  filterModel.value = null
}

// Methods
function refreshLogs() {
  // Force reactivity update
  aiService.getRequestLog()
}

function viewDetails(row) {
  selectedRequest.value = row
  showDetails.value = true
  detailsTab.value = 'request'
}

async function retryRequest(row) {
  try {
    await aiService.chat(row.options.messages, row.options, aiConfig.getCurrentConfig())
    $q.notify({
      type: 'positive',
      message: 'Request retried successfully',
    })
    refreshLogs()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Retry failed: ' + error.message,
    })
  }
}

function clearLogs() {
  $q.dialog({
    title: 'Clear Logs',
    message: 'Are you sure you want to clear all logs?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    aiService.clearRequestLog()
    refreshLogs()
  })
}

function exportLogs() {
  const data = JSON.stringify(aiService.getRequestLog(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-logs-${new Date().toISOString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.code-block {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}
</style>
