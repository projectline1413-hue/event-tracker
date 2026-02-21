<script setup lang="ts">
import { computed } from "vue";

interface AppEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  participant_count?: number;
}

const props = withDefaults(defineProps<{
  event: AppEvent;
  compact?: boolean;
  variant?: 'dark' | 'light';
}>(), {
  compact: false,
  variant: 'dark'
});

const formatTime = (iso: string) => {
  return new Date(iso).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const startDateFormatted = computed(() => formatTime(props.event.start_date));
const endDateFormatted = computed(() => formatTime(props.event.end_date));
</script>

<template>
  <div
    class="group relative overflow-hidden transition-all duration-500 hover:-translate-y-1"
    :class="[
      compact ? 'flex p-4 gap-6 min-h-[160px]' : 'flex flex-col h-full min-h-[450px]',
      variant === 'light' 
        ? 'bg-white border border-slate-200 shadow-sm hover:shadow-xl' 
        : 'bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
      compact ? 'rounded-3xl' : 'rounded-4xl'
    ]"
  >
    <!-- Background Gradient Glow (Only for dark variant) -->
    <div v-if="variant === 'dark'" class="absolute -inset-1 bg-linear-to-r from-emerald-500/20 to-cyan-500/20 rounded-4xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>

    <!-- Cover Image Section -->
    <div
      class="relative overflow-hidden shrink-0"
      :class="compact ? 'w-32 h-auto rounded-3xl' : 'h-56 rounded-t-4xl'"
    >
      <img
        v-if="event.cover_image_url"
        :src="event.cover_image_url"
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        alt="Event Cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
        :class="variant === 'light' ? 'bg-slate-100' : 'bg-linear-to-br from-slate-800 to-slate-900'"
      >
        <span class="text-4xl font-black uppercase italic" :class="variant === 'light' ? 'text-slate-200' : 'text-white/10'">{{ event.title.charAt(0) }}</span>
      </div>
      
      <!-- Overlay Gradient (for full height cards) -->
      <div v-if="!compact" class="absolute inset-0 bg-linear-to-t from-[#0f172a] via-transparent to-transparent opacity-60"></div>
      
      <slot name="badges"></slot>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex-1 flex flex-col justify-between" :class="compact ? 'py-1 pr-2' : 'p-8'">
      <div class="space-y-4">
        <h3
          class="font-black leading-tight uppercase italic transition-colors group-hover:text-emerald-500 wrap-break-word"
          :class="[
            compact ? 'text-xl' : 'text-2xl mb-3',
            variant === 'light' ? 'text-slate-900' : 'text-white'
          ]"
        >
          {{ event.title }}
        </h3>
        
        <!-- Adjusted text to 18px (text-lg) and removed line-clamp to ensure all info is visible -->
        <p v-if="event.description && !compact" 
          class="text-lg leading-relaxed wrap-break-word whitespace-pre-wrap"
          :class="variant === 'light' ? 'text-slate-600' : 'text-slate-300'"
        >
          {{ event.description }}
        </p>

        <!-- Dates -->
        <div class="flex flex-wrap items-center gap-4" :class="compact ? 'mt-2' : 'mb-6'">
          <div class="flex flex-col">
            <span class="text-[11px] font-black text-emerald-500/80 uppercase tracking-[0.3em]">Start</span>
            <span class="text-lg font-bold" :class="variant === 'light' ? 'text-slate-700' : 'text-slate-200'">{{ startDateFormatted }}</span>
          </div>
          <div class="w-px h-8 hidden sm:block" :class="variant === 'light' ? 'bg-slate-200' : 'bg-white/10'"></div>
          <div class="flex flex-col">
            <span class="text-[11px] font-black text-rose-500/80 uppercase tracking-[0.3em]">End</span>
            <span class="text-lg font-bold" :class="variant === 'light' ? 'text-slate-700' : 'text-slate-200'">{{ endDateFormatted }}</span>
          </div>
        </div>
      </div>

      <!-- Actions Slot -->
      <div :class="compact ? 'mt-4' : 'mt-auto pt-6'">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No extra styles needed, using pure Tailwind with custom values where necessary */
</style>
