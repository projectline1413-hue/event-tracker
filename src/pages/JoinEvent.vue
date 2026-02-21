<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { supabase } from "../lib/supabase";
import liff from "@line/liff";
import { notify } from "../lib/notify";
import EventCard from "../components/EventCard.vue";

interface AppEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
}

const events = ref<AppEvent[]>([]);
const myRegistrations = ref<any[]>([]); // To track already joined events
const loading = ref(true);
const isJoining = ref<string | null>(null);
const userProfile = ref<any>(null);

// Computed split for Upcoming vs Past events
const upcomingEvents = computed(() => {
  const now = new Date();
  return events.value.filter(e => new Date(e.end_date) >= now);
});

const pastEvents = computed(() => {
  const now = new Date();
  return events.value.filter(e => new Date(e.end_date) < now);
});

const initLiff = async () => {
  try {
    await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    userProfile.value = profile;

    // Fetch Profile ID and existing registrations
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("line_user_id", profile.userId)
      .single();
    
    if (dbProfile) {
      userProfile.value.db_id = dbProfile.id;
      await fetchUserRegistrations(dbProfile.id);
    }
  } catch (err) {
    console.error("LIFF Init Error:", err);
  }
};

const fetchUserRegistrations = async (userId: string) => {
  if (!userId) return;
  const { data, error } = await supabase
    .from("event_registrations")
    .select(`
      event_id,
      events (id, title, start_date, end_date)
    `)
    .eq("user_id", userId);

  if (!error) {
    myRegistrations.value = data || [];
  }
};

const fetchEvents = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) console.error(error);
  else events.value = data || [];
  loading.value = false;
};

const isEventJoined = (id: string) => {
  return myRegistrations.value.some(r => r.event_id === id);
};

const joinEvent = async (targetEvent: AppEvent) => {
  if (!userProfile.value?.db_id) {
     notify.warn("โปรไฟล์ไม่สมบูรณ์", "กรุณาสร้างโปรไฟล์ก่อนเข้าร่วมกิจกรรม");
     return;
  }
  
  // 1. Duplicate check
  if (isEventJoined(targetEvent.id)) {
    notify.info("สมัครแล้ว", "คุณลงทะเบียนกิจกรรมนี้ไปแล้วครับ");
    return;
  }

  // 2. Overlap Check
  const targetStart = new Date(targetEvent.start_date).getTime();
  const targetEnd = new Date(targetEvent.end_date).getTime();

  for (const reg of myRegistrations.value) {
    if (!reg.events) continue;
    const regEvent = reg.events;
    const regStart = new Date(regEvent.start_date).getTime();
    const regEnd = new Date(regEvent.end_date).getTime();

    if (targetStart < regEnd && regStart < targetEnd) {
      notify.warn("เวลาทับซ้อนกัน", `⚠️ เวลาชนกับกิจกรรม "${regEvent.title}"\nกรุณาเลือกกิจกรรมที่เวลาไม่ทับซ้อนกันครับ`);
      return;
    }
  }

  isJoining.value = targetEvent.id;
  try {
    const { error } = await supabase
      .from("event_registrations")
      .insert({
        event_id: targetEvent.id,
        user_id: userProfile.value.db_id
      });

    if (error) throw error;
    
    notify.success("สำเร็จ!", "ลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อยแล้ว 🏃‍♂️⚡");
    await fetchUserRegistrations(userProfile.value.db_id);
  } catch (err: any) {
    notify.error("เกิดข้อผิดพลาด", "ไม่สามารถลงทะเบียนได้: " + err.message);
  } finally {
    isJoining.value = null;
  }
};

const leaveEvent = async (eventId: string, eventTitle: string) => {
  const confirmed = await notify.confirm(
    "ออกจากกิจกรรม?",
    `คุณแน่ใจหรือไม่ที่จะออกจากกิจกรรม "${eventTitle}"?`
  );
  if (!confirmed) return;

  try {
    const { error } = await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userProfile.value.db_id);

    if (error) throw error;
    notify.success("สำเร็จ", "ออกจากกิจกรรมเรียบร้อยแล้ว");
    await fetchUserRegistrations(userProfile.value.db_id);
  } catch (err: any) {
    notify.error("ผิดพลาด", "ไม่สามารถออกจากกิจกรรมได้: " + err.message);
  }
};

onMounted(async () => {
  await initLiff();
  await fetchEvents();
});
</script>

<template>
  <div class="min-h-screen bg-[#071427] text-white font-kanit pb-32 animate-fade-in relative">
    <!-- Background Decor -->
    <div class="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>

    <!-- Hero Section -->
    <div class="relative pt-24 pb-16 px-6 overflow-hidden">
       <div class="relative z-10 text-center">
         <div class="inline-block px-4 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
            <p class="text-[10px] font-black text-emerald-400 tracking-[0.4em] uppercase">Limitless Challenges</p>
         </div>
         <h1 class="text-6xl font-black italic uppercase tracking-tighter leading-none mb-6">
           GO<span class="text-emerald-500 text-glow">FLOW</span> EVENTS
         </h1>
         <p class="text-slate-400 font-bold max-w-sm mx-auto text-lg leading-relaxed">
           Push your boundaries. Join the community of elite runners in exclusive challenges.
         </p>
       </div>
    </div>

    <div class="px-6 space-y-16 max-w-7xl mx-auto">
      
      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="i in 3" :key="i" class="h-96 bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-4xl animate-pulse"></div>
      </div>

      <!-- Content Sections -->
      <div v-else class="space-y-20">
        
        <!-- UPCOMING EVENTS SECTION -->
        <section v-if="upcomingEvents.length > 0" class="space-y-10">
          <div class="flex items-center justify-between border-l-4 border-emerald-500 pl-6 h-10">
             <div>
               <h2 class="text-3xl font-black italic uppercase tracking-tight text-white">UPCOMING <span class="text-emerald-500">EXPERIENCES</span></h2>
               <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Live and Near-Future Challenges</p>
             </div>
             <span class="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black text-emerald-400 rounded-full tracking-widest">{{ upcomingEvents.length }} ACTIVE</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <EventCard v-for="event in upcomingEvents" :key="event.id" :event="event" class="animate-fade-in">
              <template #badges>
                <div 
                  v-if="isEventJoined(event.id)" 
                  class="absolute top-6 right-6 z-20 px-4 py-1.5 bg-emerald-500 text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2"
                >
                   <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"/></svg>
                   ACTIVE SESSION
                </div>
                <div v-else class="absolute top-6 left-6 z-20 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                   <span class="text-[9px] font-black text-emerald-400 tracking-widest uppercase">Open Entry</span>
                </div>
              </template>

              <template #actions>
                <div class="flex flex-col gap-4 mt-2">
                  <button 
                    @click="joinEvent(event)"
                    :disabled="!!isJoining || isEventJoined(event.id)"
                    :class="[
                      'group relative w-full h-14 rounded-2xl transition-all duration-500 overflow-hidden shadow-lg',
                      isEventJoined(event.id) 
                        ? 'bg-slate-800/50 border border-white/5 text-slate-500 cursor-default' 
                        : 'bg-emerald-500 text-black hover:bg-white hover:shadow-emerald-500/20 active:scale-95'
                    ]"
                  >
                    <div v-if="!isEventJoined(event.id)" class="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <span class="relative z-10 font-black uppercase tracking-[0.2em] italic text-[11px]">
                      <template v-if="isJoining === event.id">Syncing Profile...</template>
                      <template v-else-if="isEventJoined(event.id)">Status: Registered</template>
                      <template v-else>Confirm Registration</template>
                    </span>
                  </button>
                  <button v-if="isEventJoined(event.id)" @click="leaveEvent(event.id, event.title)" class="w-full text-center text-[10px] font-black text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-[0.3em] py-2">Withdraw Entry</button>
                </div>
              </template>
            </EventCard>
          </div>
        </section>

        <!-- NO ACTIVE EVENTS MSG -->
        <div v-else class="py-24 text-center">
          <div class="w-24 h-24 bg-white/5 rounded-4xl flex items-center justify-center mx-auto mb-8 border border-white/10 rotate-12">
             <svg class="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <p class="text-slate-600 font-black italic uppercase tracking-widest text-sm">No Active Events Right Now</p>
        </div>

        <!-- PAST EVENTS SECTION -->
        <section v-if="pastEvents.length > 0" class="space-y-10 opacity-60 hover:opacity-100 transition-opacity">
          <div class="flex items-center justify-between border-l-4 border-slate-700 pl-6 h-10">
             <div>
               <h2 class="text-2xl font-black italic uppercase tracking-tight text-slate-400">PAST <span class="text-slate-600">CHALLENGES</span></h2>
               <p class="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1">Archived Global Leaderboards</p>
             </div>
             <span class="px-3 py-1 bg-white/5 border border-white/5 text-[9px] font-black text-slate-500 rounded-full tracking-widest">{{ pastEvents.length }} ARCHIVED</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 grayscale-[0.5]">
            <EventCard v-for="event in pastEvents" :key="event.id" :event="event" class="animate-fade-in filter brightness-75">
              <template #badges>
                <div class="absolute top-6 left-6 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                   <span class="text-[9px] font-black text-slate-500 tracking-widest uppercase">Entry Closed</span>
                </div>
              </template>
              <template #actions>
                <div class="w-full h-14 flex items-center justify-center rounded-2xl bg-black/20 border border-white/5">
                  <span class="text-[10px] font-black text-slate-600 uppercase italic tracking-widest">Challenge Concluded</span>
                </div>
              </template>
            </EventCard>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<style scoped>
.text-glow {
  text-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
}

.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
