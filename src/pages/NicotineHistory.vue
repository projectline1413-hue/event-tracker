<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import liff from "@line/liff";

const history = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  const profile = await liff.getProfile();

  const { data } = await supabase
    .from("nicotine_assessments")
    .select("*")
    .eq("line_user_id", profile.userId)
    .order("created_at", { ascending: false });

  history.value = data || [];
  loading.value = false;
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8">
    <!-- Header -->
    <div class="max-w-2xl mx-auto mb-8">
      <h1 class="text-2xl font-bold text-slate-800 text-center">
        ประวัติการประเมิน
      </h1>
      <p class="text-slate-500 text-center mt-2 text-sm">
        ตรวจสอบผลการประเมินย้อนหลังของคุณ
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-slate-500 mt-10">
      กำลังโหลดข้อมูล...
    </div>

    <!-- Empty State -->
    <div
      v-else-if="history.length === 0"
      class="text-center bg-white shadow-sm rounded-2xl p-8 max-w-md mx-auto border"
    >
      <p class="text-slate-600 font-medium">ยังไม่มีประวัติการประเมิน</p>
      <p class="text-slate-400 text-sm mt-2">
        เมื่อคุณทำแบบประเมิน ระบบจะแสดงผลที่นี่
      </p>
    </div>

    <!-- History List -->
    <div v-else class="max-w-2xl mx-auto space-y-4">
      <div
        v-for="item in history"
        :key="item.id"
        class="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition"
      >
        <!-- Top Row -->
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm text-slate-400">
            {{ new Date(item.created_at).toLocaleDateString() }}
          </span>

          <span
            class="text-xs font-semibold px-3 py-1 rounded-full"
            :class="{
              'bg-green-100 text-green-700': item.level === 'ต่ำ',
              'bg-yellow-100 text-yellow-700': item.level === 'ปานกลาง',
              'bg-red-100 text-red-700': item.level === 'สูง',
            }"
          >
            {{ item.level }}
          </span>
        </div>

        <!-- Score Section -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-slate-500 text-sm">คะแนนรวม</p>
            <p class="text-2xl font-bold text-slate-800">
              {{ item.score }}
            </p>
          </div>

          <div
            class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
            :class="{
              'bg-green-500': item.level === 'ต่ำ',
              'bg-yellow-500': item.level === 'ปานกลาง',
              'bg-red-500': item.level === 'สูง',
            }"
          >
            {{ item.score }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
