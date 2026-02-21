<script setup lang="ts">
const props = defineProps<{
  templates: any[];
  selectedTemplate: any;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "select", tpl: any): void;
  (e: "generate"): void;
}>();
</script>

<template>
  <div class="p-4">
    <h2 class="text-lg font-bold mb-4">เลือก Template</h2>

    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="border p-2 cursor-pointer"
        :class="{ 'border-yellow-400': selectedTemplate?.id === tpl.id }"
        @click="emit('select', tpl)"
      >
        {{ tpl.name }}
      </div>
    </div>

    <button
      class="mt-6 w-full bg-yellow-500 text-black py-3 rounded-xl"
      @click="emit('generate')"
      :disabled="loading"
    >
      สร้างโปสเตอร์
    </button>
  </div>
</template>
