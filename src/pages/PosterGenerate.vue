<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../lib/supabase";
import { globalProfile } from "../composables/useGlobalUser";
import { getPosterData } from "../composables/usePosterData";
import TemplateSelector from "../components/poster/TemplateSelector.vue";
import PosterRenderer from "../components/poster/PosterRenderer.vue";
import PosterEditor from "../components/poster/PosterEditor.vue";

const route = useRoute();
const eventId = route.params.eventId as string;

// "select" | "create" | "edit"
const mode = ref("select");

const templates = ref<any[]>([]);
const selectedTemplate = ref<any>(null);
const posterData = ref<any>(null);
const loading = ref(false);
const fetchingTemplates = ref(true);
const error = ref<string | null>(null);

// For editing
const templateToEdit = ref<any>(null);

async function loadTemplates() {
  try {
    fetchingTemplates.value = true;
    if (!eventId) {
      error.value = "ไม่พบ eventId";
      return;
    }

    const { data, error: tplError } = await supabase
      .from("poster_templates")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (tplError) throw tplError;
    templates.value = data ?? [];
  } catch (err: any) {
    console.error("Load Templates Error:", err);
    error.value = "โหลด Template ไม่สำเร็จ";
  } finally {
    fetchingTemplates.value = false;
  }
}

onMounted(() => {
  loadTemplates();
});

async function generatePoster() {
  try {
    if (!selectedTemplate.value) return;
    if (!globalProfile.value?.id) {
      error.value = "ไม่พบข้อมูลผู้ใช้";
      return;
    }

    loading.value = true;
    error.value = null;

    posterData.value = await getPosterData(globalProfile.value.id, eventId);
  } catch (err: any) {
    console.error("Generate Poster Error:", err);
    error.value = "สร้างโปสเตอร์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

// Editor Handlers
function startCreate() {
  templateToEdit.value = null;
  mode.value = "create";
}

function startEdit(tpl: any) {
  templateToEdit.value = tpl;
  mode.value = "edit"; // Or "create" with initial data, but "edit" is better semantically if we want to update same ID
}

function onEditorSave() {
  mode.value = "select";
  loadTemplates(); // reload list
}

function onEditorCancel() {
  mode.value = "select";
}
</script>

<template>
  <div class="h-full">
    <!-- EDITOR MODE -->
    <div v-if="mode === 'create' || mode === 'edit'" class="h-full">
      <PosterEditor
        :eventId="eventId"
        :initialTemplate="templateToEdit?.template_json"
        @save="onEditorSave"
        @cancel="onEditorCancel"
      />
    </div>

    <!-- SELECTOR MODE -->
    <div v-else class="p-4 space-y-4 max-w-4xl mx-auto">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Generated Poster</h1>
        <button
          @click="startCreate"
          class="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-700"
        >
          + Create New Template
        </button>
      </div>

      <!-- Loading Templates -->
      <div v-if="fetchingTemplates" class="text-sm opacity-70">
        กำลังโหลด Template...
      </div>

      <!-- Error -->
      <div v-if="error" class="text-red-400 text-sm">
        {{ error }}
      </div>

      <!-- Template Selector -->
      <div v-if="!fetchingTemplates && templates.length">
        <TemplateSelector
          :templates="templates"
          :selectedTemplate="selectedTemplate"
          :loading="loading"
          @select="selectedTemplate = $event"
          @generate="generatePoster"
        />
        
        <!-- Edit Button -->
         <div v-if="selectedTemplate" class="mt-2 text-center">
            <button 
              @click="startEdit(selectedTemplate)" 
              class="text-sm text-gray-500 underline hover:text-gray-800"
            >
               Edit Template: {{ selectedTemplate.name }}
            </button>
         </div>
      </div>

      <!-- No Templates -->
      <div
        v-if="!fetchingTemplates && !templates.length"
        class="text-center py-10 opacity-60 bg-gray-50 rounded-lg border-2 border-dashed"
      >
        <p>ยังไม่มี Template สำหรับ Event นี้</p>
        <button @click="startCreate" class="mt-4 text-blue-500 underline">
          สร้าง Template แรก
        </button>
      </div>

      <!-- Final Poster Renderer -->
      <div v-if="posterData && selectedTemplate" class="mt-10">
        <h3 class="text-lg font-bold mb-4 text-center">Preview</h3>
        <div class="flex justify-center overflow-auto">
          <PosterRenderer
            :template="selectedTemplate.template_json"
            :data="posterData"
          />
        </div>
      </div>
    </div>
  </div>
</template>
