<template>
  <q-page padding>
    <ErrorBoundary>
      <div v-if="loading" class="flex flex-center">
        <q-spinner color="primary" size="3em" />
      </div>
      <div v-else>
        <!-- Main Content -->
        <div class="row q-mb-md items-center">
          <div class="text-h6">My Theses</div>
          <q-space />
          <q-btn
            color="primary"
            icon="add"
            label="New Thesis"
            @click="showNewThesisDialog = true"
          />
        </div>

        <div class="row q-col-gutter-md">
          <div v-for="thesis in theses" :key="thesis.id" class="col-12 col-md-6 col-lg-4">
            <q-card>
              <q-card-section>
                <div class="text-h6">{{ thesis.title }}</div>
                <div class="text-caption">Status: {{ thesis.status }}</div>
                <div class="text-caption">
                  Updated: {{ new Date(thesis.updated_at).toLocaleDateString() }}
                </div>
              </q-card-section>
              <q-card-actions align="right">
                <q-btn
                  flat
                  color="primary"
                  label="Open"
                  @click="$router.push(`/student/thesis/${thesis.id}`)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>

        <!-- New Thesis Dialog -->
        <q-dialog v-model="showNewThesisDialog">
          <q-card style="min-width: 350px">
            <q-card-section>
              <div class="text-h6">Create New Thesis</div>
            </q-card-section>

            <q-card-section>
              <q-tabs
                v-model="activeTab"
                dense
                class="text-grey"
                active-color="primary"
                indicator-color="primary"
                align="justify"
                narrow-indicator
              >
                <q-tab name="explore" label="Explore Topics" icon="psychology" />
                <q-tab name="manual" label="Manual Creation" icon="edit" />
              </q-tabs>

              <q-tab-panels v-model="activeTab" animated>
                <q-tab-panel name="explore">
                  <ThesisExplorer @thesis-created="onThesisCreated" />
                </q-tab-panel>

                <q-tab-panel name="manual">
                  <q-input
                    v-model="newThesisTitle"
                    label="Thesis Title"
                    filled
                    class="q-mt-md"
                    :rules="[(val) => !!val || 'Title is required']"
                  />
                </q-tab-panel>
              </q-tab-panels>
            </q-card-section>

            <q-card-actions align="right" v-if="activeTab === 'manual'">
              <q-btn flat label="Cancel" color="primary" v-close-popup />
              <q-btn
                flat
                label="Create"
                color="primary"
                @click="createNewThesis"
                :loading="creating"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </ErrorBoundary>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useThesisStore } from 'src/stores/thesis/thesis'
import { useQuasar } from 'quasar'
import ThesisExplorer from 'src/components/thesis/ThesisExplorer.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'

const thesisStore = useThesisStore()
const $q = useQuasar()

const theses = ref([])
const loading = ref(true)
const creating = ref(false)
const newThesisTitle = ref('')
const activeTab = ref('list') // Changed from 'explore' to 'list'
const showNewThesisDialog = ref(false)

async function loadTheses() {
  loading.value = true
  try {
    theses.value = await thesisStore.fetchAllTheses()
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

async function createNewThesis() {
  if (!newThesisTitle.value) {
    $q.notify({
      type: 'warning',
      message: 'Please enter a thesis title',
    })
    return
  }

  creating.value = true
  try {
    await thesisStore.createThesis(newThesisTitle.value)
    newThesisTitle.value = ''
    showNewThesisDialog.value = false
    await loadTheses()
    $q.notify({
      type: 'positive',
      message: 'Thesis created successfully',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to create thesis',
    })
    console.error('Error creating thesis:', error)
  } finally {
    creating.value = false
  }
}

async function onThesisCreated() {
  showNewThesisDialog.value = false
  await loadTheses()
}

onMounted(() => {
  loadTheses()
})
</script>

<script>
export default {
  name: 'StudentDashboard',
}
</script>
