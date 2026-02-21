<script setup lang="ts">
const props = defineProps<{
  template: any;
  data: any;
}>();

function getValue(obj: any, path: string) {
  if (!path) return "";
  return path.split(".").reduce((o, key) => o?.[key], obj);
}
</script>

<template>
  <div
    v-if="template"
    class="relative overflow-hidden shadow-lg bg-white"
    :style="{
      width: template.width + 'px',
      height: template.height + 'px',
      backgroundImage: template.background
        ? `url(${template.background})`
        : 'none',
      backgroundSize: template.backgroundSize === 'custom' 
        ? (template.customBackgroundSize || 'cover') 
        : (template.backgroundSize || 'cover'),
      backgroundPosition: template.backgroundPosition || 'center',
    }"
  >
    <template v-for="el in template.elements" :key="el.id">
      <!-- Text Element -->
      <div
        v-if="el.type === 'text'"
        class="absolute whitespace-pre"
        :style="{
          left: el.x + 'px',
          top: el.y + 'px',
          color: el.color || '#000000',
          fontSize: (el.fontSize || 16) + 'px',
          fontWeight: el.fontWeight || 'normal',
          fontFamily: el.fontFamily || 'sans-serif',
          textAlign: el.textAlign || 'left',
          zIndex: el.zIndex || 1,
        }"
      >
        {{ el.bind ? getValue(data, el.bind) : el.staticText }}
      </div>

      <!-- Image Element -->
      <img
        v-if="el.type === 'image'"
        :src="el.bind ? getValue(data, el.bind) : el.src"
        class="absolute object-cover"
        :style="{
          left: el.x + 'px',
          top: el.y + 'px',
          width: el.width + 'px',
          height: el.height + 'px',
          borderRadius: (el.borderRadius || 0) + 'px',
          zIndex: el.zIndex || 1,
        }"
      />
    </template>
  </div>
</template>
