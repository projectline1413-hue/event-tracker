<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "../lib/supabase";
import liff from "@line/liff";
import { notify } from "../lib/notify";
import { globalProfile, setGlobalProfile, globalLoading } from "../composables/useGlobalUser";

const router = useRouter();
const route = useRoute();
const mode = ref<null | 'create' | 'join' | 'manage' | 'invitation'>(null);
const teamName = ref("");
const joinCode = ref("");
const isLoading = ref(false);
const currentTeam = ref<any>(null);
const invitedTeam = ref<any>(null);
const teamMembers = ref<any[]>([]);

// 1. Initial State Check
const init = async () => {
  // Case A: User has a team already
  if (globalProfile.value?.team_id) {
    await loadTeamData(globalProfile.value.team_id);
    mode.value = "manage";
    return;
  }

  // Case B: Deep linked to a team (Invitation)
  const invitedId = route.params.id as string;
  if (invitedId) {
    isLoading.value = true;
    try {
      const { data } = await supabase.from("teams").select("*").eq("id", invitedId).single();
      if (data) {
        invitedTeam.value = data;
        mode.value = "invitation";
      } else {
        notify.error("ไม่พบทีม", "ลิงก์เชิญอาจหมดอายุหรือไม่ถูกต้อง");
        mode.value = null;
      }
    } catch (err) {
      mode.value = null;
    } finally {
      isLoading.value = false;
    }
    return;
  }

  // Default mode
  mode.value = null;
};

onMounted(() => {
  if (globalProfile.value) init();
});

watch(globalProfile, (newVal) => {
  if (newVal && !currentTeam.value && mode.value !== 'invitation') init();
}, { deep: true });

// Load Team data
const loadTeamData = async (teamId: string) => {
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (team) {
    currentTeam.value = team;
    const { data: members } = await supabase
      .from("profiles")
      .select("id, display_name, picture_url")
      .eq("team_id", teamId);
    teamMembers.value = members || [];
  }
};

const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create Team
const handleCreateTeam = async () => {
  if (!teamName.value.trim()) return notify.warn("ข้อมูลไม่ครบ", "กรุณาตั้งชื่อทีมของคุณก่อน");
  if (!globalProfile.value) return;

  isLoading.value = true;
  try {
    let uniqueCode = "";
    let isUnique = false;
    while (!isUnique) {
      uniqueCode = generateRoomCode();
      const { data } = await supabase.from("teams").select("room_code").eq("room_code", uniqueCode);
      if (data && data.length === 0) isUnique = true;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .insert([{ team_name: teamName.value.trim(), room_code: uniqueCode, leader_id: globalProfile.value.id }])
      .select()
      .single();

    if (teamError) throw teamError;

    const { error: upError } = await supabase
      .from("profiles")
      .update({ team_id: teamData.id })
      .eq("id", globalProfile.value.id);

    if (upError) throw upError;

    setGlobalProfile({ ...globalProfile.value, team_id: teamData.id });
    await loadTeamData(teamData.id);
    mode.value = "manage";
    notify.success("สำเร็จ!", "สร้างทีมของคุณเรียบร้อยแล้ว");
  } catch (err: any) {
    notify.error("ผิดพลาด", err.message);
  } finally {
    isLoading.value = false;
  }
};

// Accept Invitation
const handleAcceptInvite = async () => {
  if (!invitedTeam.value || !globalProfile.value) return;
  isLoading.value = true;
  try {
    const { error: upError } = await supabase
      .from("profiles")
      .update({ team_id: invitedTeam.value.id })
      .eq("id", globalProfile.value.id);

    if (upError) throw upError;

    setGlobalProfile({ ...globalProfile.value, team_id: invitedTeam.value.id });
    await loadTeamData(invitedTeam.value.id);
    mode.value = "manage";
    notify.success("สำเร็จ!", `คุณเข้าร่วมทีม ${invitedTeam.value.team_name} แล้ว`);
  } catch (err: any) {
    notify.error("ผิดพลาด", "ไม่สามารถเข้าทีมได้");
  } finally {
    isLoading.value = false;
  }
};

// Join Team via Code
const handleJoinTeam = async () => {
  if (!joinCode.value.trim()) return notify.warn("ข้อมูลไม่ครบ", "กรุณาระบุรหัสทีม");
  if (!globalProfile.value) return;

  isLoading.value = true;
  try {
    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("room_code", joinCode.value.trim().toUpperCase())
      .single();

    if (!team) return notify.error("ไม่พบทีม", "รหัสทีมไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");

    const { error: upError } = await supabase
      .from("profiles")
      .update({ team_id: team.id })
      .eq("id", globalProfile.value.id);

    if (upError) throw upError;

    setGlobalProfile({ ...globalProfile.value, team_id: team.id });
    await loadTeamData(team.id);
    mode.value = "manage";
    notify.success("ยินดีต้อนรับ!", "คุณเข้าร่วมทีมเรียบร้อยแล้ว");
  } catch (err: any) {
    notify.error("ผิดพลาด", "ไม่สามารถเข้าร่วมทีมได้ในขณะนี้");
  } finally {
    isLoading.value = false;
  }
};

// Leave Team
const leaveTeam = async () => {
  const confirmed = await notify.confirm("ออกจากทีม?", "คุณแน่ใจหรือไม่ที่จะออกจากกลุ่มเพื่อนทีมนี้?");
  if (!confirmed) return;
  if (!globalProfile.value) return;

  isLoading.value = true;
  try {
    await supabase.from("profiles").update({ team_id: null }).eq("id", globalProfile.value.id);
    setGlobalProfile({ ...globalProfile.value, team_id: null });
    currentTeam.value = null;
    teamMembers.value = [];
    mode.value = null;
    notify.success("สำเร็จ", "ออกจากทีมเรียบร้อยแล้ว");
  } catch (err) {
    notify.error("ผิดพลาด", "ไม่สามารถทำรายการได้");
  } finally {
    isLoading.value = false;
  }
};

// Copy invite code
const copyCode = () => {
  if (!currentTeam.value) return;
  navigator.clipboard.writeText(currentTeam.value.room_code);
  notify.success("คัดลอกแล้ว", "คัดลอกรหัสทีมเรียบร้อย");
};

// Copy invite link
const copyInviteLink = () => {
  if (!currentTeam.value) return;
  const link = `${window.location.origin}/#/join/${currentTeam.value.id}`;
  const text = `มาร่วมขับเคี่ยวในสมรภูมินักวิ่งทีม ${currentTeam.value.team_name} กับผม! \nรหัสเข้าทีมคือ: ${currentTeam.value.room_code}\nเข้าสู่ระบบได้ที่: ${link}`;
  navigator.clipboard.writeText(text);
  notify.success("คัดลอกลิงก์แล้ว", "ส่งลิงก์และรหัสให้เพื่อนได้เลยครับ!");
};

// Share to LINE
const shareToLine = async () => {
  if (!liff.isApiAvailable("shareTargetPicker")) {
    copyInviteLink();
    return;
  }

  try {
    const link = `${window.location.origin}/#/join/${currentTeam.value.id}`;
    const res = await liff.shareTargetPicker([
      {
        type: "flex",
        altText: `ร่วมทีมวิ่งกับฉันใน ${currentTeam.value.team_name}!`,
        contents: {
          type: "bubble",
          size: "mega",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "GOFLOW SQUAD", weight: "bold", color: "#FFD700", size: "sm" }
            ],
            backgroundColor: "#071427"
          },
          hero: {
             type: "image",
             url: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80",
             size: "full",
             aspectRatio: "20:13",
             aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "INVITATION", weight: "bold", size: "xs", color: "#FFD700" },
              { type: "text", text: currentTeam.value.team_name, weight: "bold", size: "xl", margin: "xs", color: "#000000" },
              { type: "text", text: `Join code: ${currentTeam.value.room_code}`, size: "md", color: "#666666", margin: "md", weight: "bold" }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                action: { type: "uri", label: "JOIN NOW", uri: link },
                style: "primary",
                color: "#FFD700"
              }
            ]
          }
        }
      }
    ]);
    if (res) notify.success("สำเร็จ", "ส่งคำเชิญเรียบร้อยแล้ว!");
  } catch (err) {
    console.error(err);
    copyInviteLink();
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#071427] text-white p-6 pb-32 font-kanit relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-[#FFD700]/5 to-transparent pointer-events-none"></div>

    <div class="max-w-md mx-auto relative z-10 pt-10">
      
      <!-- LOADING -->
      <div v-if="globalLoading || isLoading" class="flex flex-col items-center justify-center py-32">
        <div class="w-10 h-10 border-2 border-[#FFD700]/10 border-t-[#FFD700] rounded-full animate-spin"></div>
        <p class="mt-4 text-[10px] font-black text-[#FFD700] uppercase tracking-[0.4em]">Processing Legacy...</p>
      </div>

      <!-- INVITATION MODE (Deep Link) -->
      <div v-else-if="mode === 'invitation' && invitedTeam" class="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
         <div class="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 rotate-3 shadow-2xl">
           <span class="text-5xl">📩</span>
        </div>
        <p class="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-2 opacity-80">You've been Invited</p>
        <h1 class="text-5xl font-black italic tracking-tighter text-white mb-4 uppercase leading-none">
          JOIN <span class="text-[#FFD700]">{{ invitedTeam.team_name }}</span>
        </h1>
        <p class="text-gray-500 text-[11px] font-bold px-10 leading-relaxed uppercase tracking-wider mb-12">Your presence has been requested. Join this squad to embark on your combined running journey.</p>
        
        <div class="space-y-4">
          <button @click="handleAcceptInvite" class="w-full h-18 bg-linear-to-tr from-[#FFD700] to-[#FFC300] text-[#071427] font-black italic rounded-2xl shadow-xl shadow-[#FFD700]/10 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest">
            Accept Invitation 🤝
          </button>
          <button @click="mode = null" class="w-full py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] italic">
            Decline & Create Own Party
          </button>
        </div>
      </div>

      <!-- MANAGE TEAM -->
      <div v-else-if="mode === 'manage' && currentTeam" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div class="mb-10 text-center">
            <p class="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-2 opacity-80">Your Squad</p>
            <h2 class="text-4xl font-black italic text-white tracking-tighter leading-none uppercase">
              {{ currentTeam.team_name }}
            </h2>
          </div>

          <!-- Code Card -->
          <div class="bg-linear-to-br from-[#FFD700] to-[#FFC300] rounded-3xl p-6 mb-10 shadow-lg shadow-[#FFD700]/10 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10">
              <p class="text-[10px] text-[#071427]/60 font-black uppercase tracking-widest mb-1">Squad Invite Code</p>
              <div class="flex items-center justify-between">
                <span @click="copyCode" class="text-4xl font-black text-[#071427] tracking-[0.2em] italic cursor-pointer active:opacity-50 transition-opacity">{{ currentTeam.room_code }}</span>
                <div class="flex gap-2">
                  <button @click="copyInviteLink" class="bg-[#071427]/10 text-[#071427] p-2 rounded-xl border border-[#071427]/10 hover:bg-[#071427]/20 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  </button>
                  <button @click="shareToLine" class="flex items-center gap-2 bg-[#071427] text-[#FFD700] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                    <span class="text-lg">💬</span> Invite
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Members -->
          <div class="space-y-4 mb-10">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-xs font-black text-gray-400 italic uppercase tracking-widest">Active Members</h3>
              <span class="text-[10px] font-black text-[#FFD700]/50 tracking-widest">{{ teamMembers.length }} / 20</span>
            </div>
            
            <div class="grid grid-cols-1 gap-3">
              <div v-for="member in teamMembers" :key="member.id" 
                class="flex items-center gap-4 bg-white/3 p-4 rounded-2xl border border-white/5 group/card hover:bg-white/5 transition-all">
                <img :src="member.picture_url || 'https://via.placeholder.com/150'" class="w-12 h-12 rounded-xl object-cover border border-white/10" />
                <div class="flex-1">
                  <p class="text-sm font-black text-gray-200 uppercase tracking-tight">{{ member.display_name }}</p>
                  <p class="text-[9px] font-black uppercase italic" :class="member.id === currentTeam.leader_id ? 'text-[#FFD700]' : 'text-gray-500'">
                    {{ member.id === currentTeam.leader_id ? 'SQUAD CAPTAIN' : 'ESTEEMED ATHLETE' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4 border-t border-white/5 pt-8">
            <button @click="router.push('/rank')" class="w-full h-16 bg-white/5 border border-white/10 text-white font-black italic rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]">
              Final Rankings 🏆
            </button>
            <button @click="leaveTeam" class="w-full py-2 text-gray-600 hover:text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] transition-colors italic">
              Abandon Squad 🚪
            </button>
          </div>
        </div>
      </div>

      <!-- INITIAL MODE -->
      <div v-else-if="!mode" class="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
        <div class="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 rotate-3 shadow-2xl">
           <span class="text-5xl">🔥</span>
        </div>
        <h1 class="text-5xl font-black italic tracking-tighter text-white mb-4 uppercase">SQUAD <span class="text-[#FFD700]">PROTOCOL</span></h1>
        <p class="text-gray-500 text-[11px] font-bold px-10 leading-relaxed uppercase tracking-wider mb-12">United we run. Establish your own party or join an existing high-performance squad.</p>
        
        <div class="space-y-5">
           <button @click="mode = 'create'" class="w-full h-18 bg-linear-to-tr from-[#FFD700] to-[#FFC300] text-[#071427] font-black italic rounded-2xl shadow-xl shadow-[#FFD700]/10 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest">
             Establish New Party 🏠
           </button>
           <button @click="mode = 'join'" class="w-full h-18 bg-white/5 border border-white/10 text-white font-black italic rounded-2xl hover:bg-white/10 active:scale-95 transition-all text-sm uppercase tracking-widest">
             Enter Existing Squad 🚪
           </button>
        </div>
      </div>

      <!-- CREATE / JOIN FORMS -->
      <div v-else-if="mode === 'create' || mode === 'join'" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button @click="mode = null" class="text-[10px] font-black text-gray-500 hover:text-[#FFD700] mb-8 flex items-center gap-2 uppercase tracking-[0.3em] transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/></svg>
          Protocol Select
        </button>

        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          
          <div v-if="mode === 'create'">
            <div class="mb-10">
              <h2 class="text-3xl font-black italic text-white uppercase tracking-tighter mb-2">SQUAD IDENTITY</h2>
              <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">How shall your team be known in the archives?</p>
            </div>
            
            <input v-model="teamName" type="text" placeholder="e.g. SONIC SYNDICATE"
              class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white font-black italic outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:bg-white/10 transition-all placeholder:text-gray-800 text-lg mb-8 uppercase" />

            <button @click="handleCreateTeam" :disabled="isLoading" class="group relative w-full h-18 bg-linear-to-tr from-[#FFD700] to-[#FFC300] text-[#071427] font-black italic rounded-2xl shadow-xl shadow-[#FFD700]/10 transition-all active:scale-95">
              <div class="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <span class="relative z-10 text-sm uppercase tracking-widest">Commence Squad</span>
            </button>
          </div>

          <div v-if="mode === 'join'">
            <div class="mb-10 text-center">
              <h2 class="text-3xl font-black italic text-white uppercase tracking-tighter mb-2">AUTHENTICATION</h2>
              <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Enter the 6-digit squad access code</p>
            </div>
            
            <input v-model="joinCode" type="text" maxlength="6" placeholder="******"
              class="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-black outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white/10 transition-all text-center text-4xl uppercase tracking-[0.4em] mb-10 placeholder:text-gray-800" />

            <button @click="handleJoinTeam" :disabled="isLoading" class="w-full h-18 bg-emerald-500 text-black font-black italic rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest">
              Establish Connection
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
