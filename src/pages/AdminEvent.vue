<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { supabase } from "../lib/supabase";
import { notify } from "../lib/notify";
import EventCard from "../components/EventCard.vue";
import { useRouter } from "vue-router";

// Define Event Interface
interface AppEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  participant_count?: number;
}

const events = ref<AppEvent[]>([]);
const loading = ref(false);
const editingId = ref<string | null>(null);
const router = useRouter();
const goToPoster = (eventId: string) => {
  router.push(`/event/${eventId}/poster`);
};
// Local state for split date/time
const form = ref({
  title: "",
  description: "",
  startDate: "",
  startHour: 8,
  startMinute: 0,
  endDate: "",
  endHour: 17,
  endMinute: 0,
  coverFile: null as File | null,
});

// Helper for padding numbers
const pad = (n: number) => n.toString().padStart(2, "0");

// Increment/Decrement helpers for "Alarm" style UI
const adjustTime = (type: "start" | "end", unit: "h" | "m", delta: number) => {
  if (type === "start") {
    if (unit === "h") {
      form.value.startHour = (form.value.startHour + delta + 24) % 24;
    } else {
      form.value.startMinute = (form.value.startMinute + delta + 60) % 60;
    }
  } else {
    if (unit === "h") {
      form.value.endHour = (form.value.endHour + delta + 24) % 24;
    } else {
      form.value.endMinute = (form.value.endMinute + delta + 60) % 60;
    }
  }
};

// Computed combined dates for submission
const combinedStartDate = computed(() => {
  if (!form.value.startDate) return "";
  return `${form.value.startDate}T${pad(form.value.startHour)}:${pad(form.value.startMinute)}:00`;
});

const combinedEndDate = computed(() => {
  if (!form.value.endDate) return "";
  return `${form.value.endDate}T${pad(form.value.endHour)}:${pad(form.value.endMinute)}:00`;
});

// Fetch Events
const fetchEvents = async () => {
  loading.value = true;

  const { data, error } = await supabase
    .from("events")
    .select("*, event_registrations(id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    loading.value = false;
    return;
  }

  events.value = (data as any[]).map((e) => ({
    ...e,
    participant_count: e.event_registrations?.length || 0,
  }));

  loading.value = false;
};

// Handle Cover File Change
const handleCoverChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    form.value.coverFile = target.files[0] || null;
  }
};

// Start Editing
const startEdit = (event: AppEvent) => {
  editingId.value = event.id;
  form.value.title = event.title;
  form.value.description = event.description || "";

  const sDate = new Date(event.start_date);
  form.value.startDate = sDate.toISOString().split("T")[0] || "";
  form.value.startHour = sDate.getHours();
  form.value.startMinute = sDate.getMinutes();

  const eDate = new Date(event.end_date);
  form.value.endDate = eDate.toISOString().split("T")[0] || "";
  form.value.endHour = eDate.getHours();
  form.value.endMinute = eDate.getMinutes();

  // Reset file selection
  form.value.coverFile = null;

  // Scroll to form
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const cancelEdit = () => {
  editingId.value = null;
  resetForm();
};

const resetForm = () => {
  form.value = {
    title: "",
    description: "",
    startDate: "",
    startHour: 8,
    startMinute: 0,
    endDate: "",
    endHour: 17,
    endMinute: 0,
    coverFile: null,
  };
};

// Save Event (Create or Update)
const saveEvent = async () => {
  if (!form.value.title || !form.value.startDate || !form.value.endDate) {
    notify.warn("ข้อมูลไม่ครบ", "กรุณาระบุชื่อกิจกรรม และวันที่");
    return;
  }

  loading.value = true;
  try {
    let coverUrl = null;
    let existingEvent: AppEvent | null = null;

    if (editingId.value) {
      existingEvent =
        events.value.find((e) => e.id === editingId.value) || null;
      coverUrl = existingEvent?.cover_image_url || null;
    }

    // 1. Upload New Cover Image if selected
    if (form.value.coverFile) {
      const fileName = `events/cover-${Date.now()}-${form.value.coverFile.name}`;
      const { error: upErr } = await supabase.storage
        .from("run-images")
        .upload(fileName, form.value.coverFile);

      if (upErr) throw upErr;
      coverUrl = supabase.storage.from("run-images").getPublicUrl(fileName)
        .data.publicUrl;
    }

    const eventData = {
      title: form.value.title,
      description: form.value.description,
      start_date: combinedStartDate.value,
      end_date: combinedEndDate.value,
      cover_image_url: coverUrl,
    };

    if (editingId.value) {
      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", editingId.value);
      if (error) throw error;
      notify.success("สำเร็จ!", "อัปเดตข้อมูลกิจกรรมเรียบร้อยแล้ว");
    } else {
      const { error } = await supabase.from("events").insert(eventData);
      if (error) throw error;
      notify.success("สำเร็จ!", "สร้างกิจกรรมใหม่เรียบร้อยแล้ว");
    }

    cancelEdit();
    fetchEvents();
  } catch (err: any) {
    console.error("Save Error:", err);
    notify.error("บันทึกไม่สำเร็จ", "เกิดข้อผิดพลาด: " + err.message);
  } finally {
    loading.value = false;
  }
};

// Delete Event
const deleteEvent = async (id: string, title: string) => {
  const confirmed = await notify.confirm(
    "ลบกิจกรรม?",
    `คุณแน่ใจหรือไม่ที่จะลบกิจกรรม "${title}"? ข้อมูลการสมัครทั้งหมดจะหายไป`,
  );
  if (!confirmed) return;

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    console.error("Delete Error:", error);
    notify.error("ลบไม่สำเร็จ", "เกิดข้อผิดพลาดในการลบกิจกรรม");
  } else {
    fetchEvents();
    notify.success("ลบสำเร็จ", "ลบกิจกรรมออกเรียบร้อยแล้ว");
  }
};

onMounted(() => {
  fetchEvents();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 font-kanit pb-32">
    <div class="max-w-7xl mx-auto px-6">
      <!-- Professional Top Bar -->
      <header
        class="flex flex-col md:flex-row justify-between items-start md:items-end pt-16 mb-16 gap-6"
      >
        <div>
          <div
            class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full mb-4"
          >
            <div
              class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"
            ></div>
            <span
              class="text-[9px] font-black text-indigo-600 tracking-[0.4em] uppercase"
              >Control Center</span
            >
          </div>
          <h1
            class="text-4xl font-black text-slate-900 italic uppercase leading-none tracking-tight"
          >
            ADMIN <span class="text-indigo-600">EVENTS</span>
          </h1>
          <p class="text-slate-500 font-medium mt-2 text-md italic">
            Orchestrate your running community at scale
          </p>
        </div>

        <div
          class="flex items-center gap-2 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div class="px-6 py-2 text-center text-slate-700">
            <p
              class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1"
            >
              Live Events
            </p>
            <p class="text-2xl font-black leading-none tracking-tighter">
              {{ events.length }}
            </p>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <!-- Right Sidebar (Event Form) -->
        <div class="lg:col-span-12 xl:col-span-4 order-1 xl:order-2">
          <div
            class="sticky top-10 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl overflow-hidden group"
          >
            <h4
              class="text-xl font-black text-slate-900 italic mb-10 uppercase tracking-tight flex items-center justify-between"
            >
              {{ editingId ? "EDIT EVENT" : "NEW EVENT" }}
              <span
                class="text-[10px] items-center p-2 bg-slate-50 border border-slate-100 rounded-xl not-italic font-bold text-slate-400"
              >
                {{ editingId ? "Update Mode" : "Project Deploy" }}
              </span>
            </h4>

            <div class="space-y-8">
              <div class="space-y-3">
                <label
                  class="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1"
                  >Event Title</label
                >
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="e.g. ULTRA GLOW 2024"
                  class="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900 placeholder:text-slate-300 text-lg"
                />
              </div>

              <div class="space-y-3">
                <label
                  class="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1"
                  >Description</label
                >
                <textarea
                  v-model="form.description"
                  rows="4"
                  placeholder="Define the experience..."
                  class="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900 placeholder:text-slate-300 text-lg leading-relaxed"
                ></textarea>
              </div>

              <!-- Alarm Clock Style Time Picker -->
              <div class="grid grid-cols-1 gap-8">
                <!-- Start Date Time -->
                <div class="space-y-4">
                  <label
                    class="text-[11px] font-black text-indigo-500 uppercase tracking-widest block pl-1"
                    >Event Commencement</label
                  >
                  <div class="flex flex-col sm:flex-row gap-4">
                    <input
                      v-model="form.startDate"
                      type="date"
                      class="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-sm"
                    />

                    <div
                      class="flex items-center justify-center bg-slate-900 rounded-2xl p-2 px-4 shadow-lg"
                    >
                      <div class="flex flex-col items-center">
                        <button
                          @click="adjustTime('start', 'h', 1)"
                          class="text-indigo-400 hover:text-white pb-1 transition-colors"
                        >
                          ▲
                        </button>
                        <span
                          class="text-2xl font-black text-white leading-none tabular-nums"
                          >{{ pad(form.startHour) }}</span
                        >
                        <button
                          @click="adjustTime('start', 'h', -1)"
                          class="text-indigo-400 hover:text-white pt-1 transition-colors"
                        >
                          ▼
                        </button>
                      </div>
                      <span
                        class="text-2xl font-black text-indigo-500 mx-1 mb-1"
                        >:</span
                      >
                      <div class="flex flex-col items-center">
                        <button
                          @click="adjustTime('start', 'm', 5)"
                          class="text-indigo-400 hover:text-white pb-1 transition-colors"
                        >
                          ▲
                        </button>
                        <span
                          class="text-2xl font-black text-white leading-none tabular-nums"
                          >{{ pad(form.startMinute) }}</span
                        >
                        <button
                          @click="adjustTime('start', 'm', -5)"
                          class="text-indigo-400 hover:text-white pt-1 transition-colors"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- End Date Time -->
                <div class="space-y-4">
                  <label
                    class="text-[11px] font-black text-rose-500 uppercase tracking-widest block pl-1"
                    >Event Conclusion</label
                  >
                  <div class="flex flex-col sm:flex-row gap-4">
                    <input
                      v-model="form.endDate"
                      type="date"
                      class="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-sm"
                    />

                    <div
                      class="flex items-center justify-center bg-slate-900 rounded-2xl p-2 px-4 shadow-lg"
                    >
                      <div class="flex flex-col items-center">
                        <button
                          @click="adjustTime('end', 'h', 1)"
                          class="text-rose-400 hover:text-white pb-1 transition-colors"
                        >
                          ▲
                        </button>
                        <span
                          class="text-2xl font-black text-white leading-none tabular-nums"
                          >{{ pad(form.endHour) }}</span
                        >
                        <button
                          @click="adjustTime('end', 'h', -1)"
                          class="text-rose-400 hover:text-white pt-1 transition-colors"
                        >
                          ▼
                        </button>
                      </div>
                      <span class="text-2xl font-black text-rose-500 mx-1 mb-1"
                        >:</span
                      >
                      <div class="flex flex-col items-center">
                        <button
                          @click="adjustTime('end', 'm', 5)"
                          class="text-rose-400 hover:text-white pb-1 transition-colors"
                        >
                          ▲
                        </button>
                        <span
                          class="text-2xl font-black text-white leading-none tabular-nums"
                          >{{ pad(form.endMinute) }}</span
                        >
                        <button
                          @click="adjustTime('end', 'm', -5)"
                          class="text-rose-400 hover:text-white pt-1 transition-colors"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <label
                  class="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1"
                  >Cover Image
                  {{ editingId ? "(Optional to Change)" : "" }}</label
                >
                <div class="relative group/file">
                  <input
                    type="file"
                    @change="handleCoverChange"
                    accept="image/*"
                    class="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div
                    class="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-6 text-center group-hover/file:bg-indigo-50 group-hover/file:border-indigo-200 transition-all duration-300"
                  >
                    <p
                      class="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                    >
                      {{
                        form.coverFile
                          ? form.coverFile.name
                          : "Select Cover Image"
                      }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-4">
                <button
                  @click="saveEvent"
                  :disabled="loading || !form.title || !form.startDate"
                  class="relative w-full h-16 bg-slate-900 text-white font-black py-4 rounded-3xl transition-all hover:bg-indigo-600 hover:shadow-[0_20px_40px_rgba(79,70,229,0.3)] disabled:opacity-20 uppercase italic text-[11px] tracking-widest group/btn overflow-hidden active:scale-95"
                >
                  <span class="relative z-10">{{
                    loading
                      ? "Syncing..."
                      : editingId
                        ? "Update Challenge"
                        : "Deploy Challenge"
                  }}</span>
                </button>

                <button
                  v-if="editingId"
                  @click="cancelEdit"
                  class="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors"
                >
                  Cancel Editing
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Left: Event List -->
        <div
          class="lg:col-span-12 xl:col-span-8 space-y-8 order-2 xl:order-1 animate-fade-in"
        >
          <div
            class="flex items-center gap-4 border-b border-slate-200 pb-8 mb-4"
          >
            <h2
              class="text-xs font-black text-slate-400 tracking-[0.4em] uppercase"
            >
              Inventory Management
            </h2>
          </div>

          <div
            v-if="loading && events.length === 0"
            class="grid grid-cols-1 md:grid-cols-2 gap-10"
          >
            <div
              v-for="i in 4"
              :key="i"
              class="bg-white border border-slate-100 rounded-4xl h-80 animate-pulse"
            ></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <EventCard
              v-for="event in events"
              :key="event.id"
              :event="event"
              variant="light"
            >
              <template #badges>
                <div
                  class="absolute top-6 left-6 z-20 px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black text-indigo-600 uppercase shadow-sm tracking-widest"
                >
                  Master File
                </div>

                <div class="absolute top-6 right-6 flex gap-2">
                  <button
                    @click="startEdit(event)"
                    class="w-10 h-10 bg-white text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-full flex items-center justify-center shadow-lg transition-all border border-slate-100 group/edit active:scale-90"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="deleteEvent(event.id, event.title)"
                    class="w-10 h-10 bg-white text-rose-400 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center shadow-lg transition-all border border-slate-100 group/del active:scale-90"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1 v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </template>

              <template #actions>
                <div
                  class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4 group-hover:bg-slate-100 transition-colors"
                >
                  <div class="text-left">
                    <p
                      class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1"
                    >
                      Registrations
                    </p>
                    <p
                      class="text-2xl font-black text-indigo-600 leading-none italic tracking-tighter"
                    >
                      {{ event.participant_count || 0 }}
                    </p>
                  </div>
                  <button
                    @click="goToPoster(event.id)"
                    class="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all transform hover:rotate-12 shadow-sm"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2.5"
                        d="M9 19V5l12 7-12 7z"
                      />
                    </svg>
                  </button>
                </div>
              </template>
            </EventCard>
          </div>

          <div
            v-if="events.length === 0 && !loading"
            class="py-32 text-center rounded-[3rem] border border-dashed border-slate-200 bg-white cursor-default opacity-50"
          >
            <p
              class="text-2xl font-black italic uppercase tracking-widest text-slate-300"
            >
              Inventory Empty
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0.5;
  cursor: pointer;
}
</style>
