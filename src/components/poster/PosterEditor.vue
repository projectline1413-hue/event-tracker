<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { supabase } from "../../lib/supabase";

const props = defineProps<{
  eventId: string;
  initialTemplate?: any;
}>();

const emit = defineEmits<{
  (e: "save", template: any): void;
  (e: "cancel"): void;
}>();

// Handle Background File Upload
const bgImageDimensions = ref<{ width: number; height: number } | null>(null);

function onBackgroundFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        template.value.background = e.target.result as string;
        
        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          bgImageDimensions.value = {
            width: img.naturalWidth,
            height: img.naturalHeight
          };
        };
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  }
}

function fitCanvasToImage() {
  if (bgImageDimensions.value) {
    template.value.width = bgImageDimensions.value.width;
    template.value.height = bgImageDimensions.value.height;
    template.value.backgroundSize = 'cover'; // Reset to cover if mostly matching
  }
}

// Default template structure
const template = ref<any>({
  name: "New Template",
  width: 1080,
  height: 1920,
  background: "",
  backgroundSize: "cover",
  customBackgroundSize: "", // For custom size input
  backgroundPosition: "center",
  elements: [],
});

// If initial template is provided, load it
onMounted(() => {
  if (props.initialTemplate) {
    template.value = JSON.parse(JSON.stringify(props.initialTemplate));
  }
});

const selectedElementId = ref<string | null>(null);
const draggingElementId = ref<string | null>(null);
const dragOffset = ref({ x: 0, y: 0 });

const scale = ref(0.4); // View scale for large posters

// Available data bindings
const dataBindings = [
  { label: "Profile Name", value: "profile.display_name" },
  { label: "Profile Picture", value: "profile.picture_url" },
  { label: "Team Name", value: "team.team_name" },
  { label: "Latest Distance (km)", value: "stats.latest_distance" },
  { label: "Total Personal Distance", value: "stats.total_personal" },
  { label: "Total Team Distance", value: "stats.total_team" },
];

const selectedElement = computed(() => {
  return template.value.elements.find(
    (el: any) => el.id === selectedElementId.value,
  );
});

function addText() {
  const newEl = {
    id: crypto.randomUUID(),
    type: "text",
    x: 50,
    y: 50,
    fontSize: 40,
    color: "#000000",
    staticText: "New Text",
    bind: "", // optional binding
    fontWeight: "normal",
  };
  template.value.elements.push(newEl);
  selectedElementId.value = newEl.id;
}

function addImage() {
  const newEl = {
    id: crypto.randomUUID(),
    type: "image",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    src: "https://placehold.co/200",
    bind: "", // optional binding
    borderRadius: 0,
  };
  template.value.elements.push(newEl);
  selectedElementId.value = newEl.id;
}

function removeElement(id: string) {
  template.value.elements = template.value.elements.filter(
    (el: any) => el.id !== id,
  );
  if (selectedElementId.value === id) selectedElementId.value = null;
}

// Dragging Logic
function startDrag(event: MouseEvent, element: any) {
  event.stopPropagation();
  selectedElementId.value = element.id;
  draggingElementId.value = element.id;

  // Calculate offset from the element's top-left corner
  // We need to account for the scale
  dragOffset.value = {
    x: event.clientX / scale.value - element.x,
    y: event.clientY / scale.value - element.y,
  };

  window.addEventListener("mousemove", onDrag);
  window.addEventListener("mouseup", stopDrag);
}

function onDrag(event: MouseEvent) {
  if (!draggingElementId.value) return;
  const el = template.value.elements.find(
    (e: any) => e.id === draggingElementId.value,
  );
  if (el) {
    el.x = event.clientX / scale.value - dragOffset.value.x;
    el.y = event.clientY / scale.value - dragOffset.value.y;
  }
}

function stopDrag() {
  draggingElementId.value = null;
  window.removeEventListener("mousemove", onDrag);
  window.removeEventListener("mouseup", stopDrag);
}

// Saving
async function saveTemplate() {
  if (!template.value.name) {
    alert("Please enter a template name");
    return;
  }

  try {
    const payload = {
      name: template.value.name,
      event_id: props.eventId,
      template_json: {
        width: template.value.width,
        height: template.value.height,
        background: template.value.background,
        backgroundSize: template.value.backgroundSize || 'cover',
        elements: template.value.elements,
      },
    };

    // Check if updating existing
    if (props.initialTemplate?.id) {
      const { error } = await supabase
        .from("poster_templates")
        .update(payload)
        .eq("id", props.initialTemplate.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("poster_templates")
        .insert([payload]);
      if (error) throw error;
    }

    alert("Saved successfully!");
    emit("save", template.value);
  } catch (e: any) {
    console.error(e);
    alert("Error saving: " + e.message);
  }
}

const currentBackgroundSize = computed(() => {
  if (template.value.backgroundSize === 'custom') {
    return template.value.customBackgroundSize || 'cover';
  }
  return template.value.backgroundSize || 'cover';
});
</script>

<template>
  <div class="flex h-screen bg-gray-100 overflow-hidden">
    <!-- Sidebar / Toolbar -->
    <aside
      class="w-80 bg-white border-r flex flex-col p-4 shadow-xl z-20 overflow-y-auto"
    >
      <h2 class="text-xl font-bold mb-4">Poster Editor</h2>

      <div class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-medium">Template Name</label>
          <input
            v-model="template.name"
            type="text"
            class="w-full border rounded p-2"
          />
        </div>

        <div>
           <h3 class="font-semibold mb-2">Canvas</h3>
           <div class="grid grid-cols-2 gap-2">
             <div>
               <label class="text-xs">Width</label>
               <input v-model.number="template.width" type="number" class="w-full border rounded p-1" />
             </div>
             <div>
              <label class="text-xs">Height</label>
              <input
                v-model.number="template.height"
                type="number"
                class="w-full border rounded p-1"
              />
            </div>
          </div>
          <div class="mt-2 space-y-2">
            <div>
               <label class="text-xs">Background Image URL</label>
               <input
                 v-model="template.background"
                 type="text"
                 placeholder="https://..."
                 class="w-full border rounded p-1"
               />
            </div>
            <div>
               <label class="text-xs">Or Upload Image</label>
               <input
                 type="file"
                 accept="image/*"
                 @change="onBackgroundFileChange"
                 class="w-full text-xs"
               />
               <p v-if="bgImageDimensions" class="text-[10px] text-gray-500 mt-1">
                 File Size: {{ bgImageDimensions.width }} x {{ bgImageDimensions.height }}px
                 <button @click="fitCanvasToImage" class="text-blue-500 underline ml-2">
                   Resize Canvas to Fit
                 </button>
               </p>
            </div>
             <div>
               <label class="text-xs">Background Fit</label>
               <select v-model="template.backgroundSize" class="w-full border rounded p-1">
                  <option value="cover">Cover (Crop to fill)</option>
                  <option value="contain">Contain (Fit inside)</option>
                  <option value="100% 100%">Stretch (Fill exact)</option>
                  <option value="100% auto">Full Width (Auto Height)</option>
                  <option value="auto 100%">Full Height (Auto Width)</option>
                  <option value="custom">Custom Value</option>
               </select>
               <input 
                 v-if="template.backgroundSize === 'custom'"
                 v-model="template.customBackgroundSize" 
                 type="text" 
                 placeholder="e.g. 150% or 500px"
                 class="w-full border rounded p-1 mt-1 text-xs" 
               />
            </div>
            <div>
               <label class="text-xs">Background Position</label>
               <select v-model="template.backgroundPosition" class="w-full border rounded p-1">
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="top left">Top Left</option>
                  <option value="top right">Top Right</option>
                  <option value="bottom left">Bottom Left</option>
                  <option value="bottom right">Bottom Right</option>
               </select>
            </div>
           </div>
        </div>

        <div class="flex gap-2">
          <button
            @click="addText"
            class="flex-1 bg-blue-500 text-white py-2 rounded"
          >
            + Add Text
          </button>
          <button
            @click="addImage"
            class="flex-1 bg-green-500 text-white py-2 rounded"
          >
            + Add Image
          </button>
        </div>
      </div>

      <!-- Selected Element Properties -->
      <div v-if="selectedElement" class="border-t pt-4">
        <h3 class="font-bold mb-2">Properties</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium">Data Binding</label>
            <select
              v-model="selectedElement.bind"
              class="w-full border rounded p-1"
            >
              <option value="">None (Static)</option>
              <option v-for="b in dataBindings" :key="b.value" :value="b.value">
                {{ b.label }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs">X</label>
              <input
                v-model.number="selectedElement.x"
                type="number"
                class="w-full border rounded p-1"
              />
            </div>
            <div>
              <label class="text-xs">Y</label>
              <input
                v-model.number="selectedElement.y"
                type="number"
                class="w-full border rounded p-1"
              />
            </div>
          </div>

          <!-- Text Specific -->
          <div v-if="selectedElement.type === 'text'" class="space-y-2">
            <div v-if="!selectedElement.bind">
              <label class="text-xs">Text Content</label>
              <textarea
                v-model="selectedElement.staticText"
                class="w-full border rounded p-1"
              ></textarea>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs">Font Size</label>
                <input
                  v-model.number="selectedElement.fontSize"
                  type="number"
                  class="w-full border rounded p-1"
                />
              </div>
              <div>
                <label class="text-xs">Color</label>
                <input
                  v-model="selectedElement.color"
                  type="color"
                  class="w-full h-8 border rounded p-1"
                />
              </div>
            </div>
            <div>
              <label class="text-xs">Font Weight</label>
              <select
                v-model="selectedElement.fontWeight"
                class="w-full border rounded p-1"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="100">Thin</option>
                <option value="900">Black</option>
              </select>
            </div>
          </div>

          <!-- Image Specific -->
          <div v-if="selectedElement.type === 'image'" class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs">Width</label>
                <input
                  v-model.number="selectedElement.width"
                  type="number"
                  class="w-full border rounded p-1"
                />
              </div>
              <div>
                <label class="text-xs">Height</label>
                <input
                  v-model.number="selectedElement.height"
                  type="number"
                  class="w-full border rounded p-1"
                />
              </div>
            </div>
            <div v-if="!selectedElement.bind">
              <label class="text-xs">Image URL</label>
              <input
                v-model="selectedElement.src"
                type="text"
                class="w-full border rounded p-1"
              />
            </div>
            <div>
              <label class="text-xs">Border Radius</label>
              <input
                v-model.number="selectedElement.borderRadius"
                type="number"
                class="w-full border rounded p-1"
              />
            </div>
          </div>

          <!-- Z-Index -->
          <div>
            <label class="text-xs">Layer (Z-Index)</label>
            <input
              v-model.number="selectedElement.zIndex"
              type="number"
              class="w-full border rounded p-1"
            />
          </div>

          <button
            @click="removeElement(selectedElement.id)"
            class="w-full bg-red-100 text-red-600 py-1 rounded mt-2"
          >
            Remove Element
          </button>
        </div>
      </div>

      <div class="mt-auto border-t pt-4 flex gap-2">
        <button
          @click="emit('cancel')"
          class="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          @click="saveTemplate"
          class="flex-1 bg-yellow-500 text-black font-bold py-2 rounded"
        >
          Save
        </button>
      </div>
    </aside>

    <!-- Main Workspace -->
    <main
      class="flex-1 relative overflow-auto bg-gray-200 flex items-center justify-center p-10"
    >
      <!-- Zoom Controls -->
      <div
        class="absolute top-4 right-4 bg-white p-2 rounded shadow flex gap-2 items-center z-10"
      >
        <button
          @click="scale = Math.max(0.1, scale - 0.1)"
          class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded"
        >
          -
        </button>
        <span class="text-sm">{{ Math.round(scale * 100) }}%</span>
        <button
          @click="scale += 0.1"
          class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded"
        >
          +
        </button>
      </div>

      <!-- Canvas Area -->
      <div
        class="bg-white shadow-2xl relative transition-transform origin-center"
        :style="{
          width: template.width + 'px',
          height: template.height + 'px',
          transform: `scale(${scale})`,
          backgroundImage: template.background
            ? `url(${template.background})`
            : 'none',
          backgroundSize: currentBackgroundSize,
          backgroundPosition: template.backgroundPosition || 'center',
        }"
        @click="selectedElementId = null"
      >
        <!-- Grid/Guide (Optional) -->

        <!-- Elements -->
        <div
          v-for="el in template.elements"
          :key="el.id"
          class="absolute cursor-move group hover:outline-2 hover:outline-blue-400 hover:outline-dashed"
          :class="{
            'outline-2 outline-blue-600 outline-solid':
              selectedElementId === el.id,
          }"
          :style="{
            left: el.x + 'px',
            top: el.y + 'px',
            zIndex: el.zIndex || 1,
            width: el.type === 'image' ? el.width + 'px' : 'auto',
            height: el.type === 'image' ? el.height + 'px' : 'auto',
          }"
          @mousedown="startDrag($event, el)"
          @click.stop
        >
          <!-- Render Content inside Editor -->
          <!-- Text -->
          <div
            v-if="el.type === 'text'"
            class="whitespace-pre select-none pointer-events-none"
            :style="{
              color: el.color || '#000000',
              fontSize: (el.fontSize || 16) + 'px',
              fontWeight: el.fontWeight || 'normal',
              fontFamily: el.fontFamily || 'sans-serif',
            }"
          >
            {{ el.bind ? '{' + el.bind + '}' : el.staticText }}
          </div>

          <!-- Image -->
          <img
            v-if="el.type === 'image'"
            :src="el.bind ? 'https://placehold.co/100?text=' + el.bind : el.src"
            class="w-full h-full object-cover select-none pointer-events-none"
            :style="{
              borderRadius: (el.borderRadius || 0) + 'px',
            }"
            draggable="false"
          />

          <!-- Selection Indicator/Coordinates -->
          <div
            v-if="selectedElementId === el.id"
            class="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] px-1 rounded whitespace-nowrap"
          >
            x: {{ Math.round(el.x) }}, y: {{ Math.round(el.y) }}
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
