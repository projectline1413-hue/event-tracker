<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { supabase } from "../lib/supabase";
import liff from "@line/liff";

/* ==============================
   STATE
============================== */

const myProfile = ref<any>(null);
const allRuns = ref<any[]>([]);
const dailyStats = ref<any[]>([]);
const isLoading = ref(true);

const today = new Date();
const currentMonth = ref(today.getMonth());
const currentYear = ref(today.getFullYear());

const MIN_YEAR = today.getFullYear() - 2; // จำกัดย้อนหลัง 24 เดือน

/* ==============================
   DATE CONTROL
============================== */

const monthStart = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1, 0, 0, 0);
});

const monthEnd = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0, 23, 59, 59);
});

const monthLabel = computed(() =>
  monthStart.value.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  }),
);

const isFutureMonth = computed(() => {
  return monthStart.value > new Date(today.getFullYear(), today.getMonth(), 1);
});

const isMinReached = computed(() => {
  return currentYear.value <= MIN_YEAR && currentMonth.value === 0;
});

const goToToday = () => {
  currentMonth.value = today.getMonth();
  currentYear.value = today.getFullYear();
};

const changeMonth = (dir: number) => {
  const newDate = new Date(currentYear.value, currentMonth.value + dir);

  if (newDate > today) return;
  if (newDate.getFullYear() < MIN_YEAR) return;

  currentMonth.value = newDate.getMonth();
  currentYear.value = newDate.getFullYear();
};

/* ==============================
   DATA COMPUTATION
============================== */

const filteredRuns = computed(() => {
  return allRuns.value.filter((run) => {
    const d = new Date(run.created_at);
    return d >= monthStart.value && d <= monthEnd.value;
  });
});

const totalSummary = computed(() => {
  let km = 0;
  let pts = 0;

  filteredRuns.value.forEach((run) => {
    const dist = Number(run.distance_km) || 0;
    const isWeekend = [0, 6].includes(new Date(run.created_at).getDay());
    const point = isWeekend ? dist * 1.5 : dist;

    km += dist;
    pts += point;
  });

  return {
    km,
    pts,
    runs: filteredRuns.value.length,
  };
});

const calculateDailyStats = () => {
  const grouped: Record<string, any> = {};

  filteredRuns.value.forEach((run) => {
    const d = new Date(run.created_at);
    const key = d.toISOString().split("T")[0] || "";
    if (!key) return; // Skip if date is invalid

    const dist = Number(run.distance_km) || 0;
    const isWeekend = [0, 6].includes(d.getDay());
    const pts = isWeekend ? dist * 1.5 : dist;

    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        km: 0,
        pts: 0,
        count: 0,
      };
    }

    grouped[key].km += dist;
    grouped[key].pts += pts;
    grouped[key].count += 1;
  });

  dailyStats.value = Object.values(grouped).sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

watch(filteredRuns, calculateDailyStats);

/* ==============================
   STREAK (FROM ALL DATA)
============================== */

const streak = computed(() => {
  const uniqueDates = [
    ...new Set(
      allRuns.value.map(
        (r) => new Date(r.created_at).toISOString().split("T")[0] || "",
      ).filter(d => d !== ""),
    ),
  ]
    .sort()
    .reverse();

  let count = 0;
  let prev: Date | null = null;

  for (const d of uniqueDates) {
    const current = new Date(d);

    if (!prev) {
      count++;
      prev = current;
      continue;
    }

    const diff = (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      count++;
      prev = current;
    } else {
      break;
    }
  }

  return count;
});

/* ==============================
   FETCH DATA
============================== */

const fetchUserData = async () => {
  isLoading.value = true;

  try {
    const lineProfile = await liff.getProfile();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("line_user_id", lineProfile.userId)
      .single();

    myProfile.value = profile;

    const { data: runs } = await supabase
      .from("user_run_history")
      .select("*")
      .eq("line_user_id", lineProfile.userId)
      .order("created_at", { ascending: false });

    allRuns.value = runs || [];
  } catch (err) {
    console.error("Dashboard Load Error:", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchUserData);
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 font-kanit pb-20">
    <!-- Loading -->
    <div v-if="isLoading" class="h-screen flex items-center justify-center">
      <div
        class="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"
      ></div>
    </div>

    <div v-else class="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <p class="text-xs text-gray-500 tracking-wide">
            Performance Dashboard
          </p>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ myProfile?.display_name }}
          </h1>
        </div>

        <img
          v-if="myProfile?.picture_url"
          :src="myProfile.picture_url"
          class="w-10 h-10 rounded-full object-cover"
        />
      </div>

      <!-- Month Navigation -->
      <div
        class="bg-white border rounded-xl px-6 py-4 flex items-center justify-between"
      >
        <button
          @click="changeMonth(-1)"
          :disabled="isMinReached"
          class="text-gray-600 disabled:opacity-30"
        >
          ←
        </button>

        <div class="text-sm font-medium">
          {{ monthLabel }}
        </div>

        <button
          @click="changeMonth(1)"
          :disabled="isFutureMonth"
          class="text-gray-600 disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div class="text-right">
        <button
          @click="goToToday"
          class="text-xs text-gray-500 hover:text-gray-800"
        >
          กลับเดือนปัจจุบัน
        </button>
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-3 gap-6">
        <div class="bg-white border rounded-xl p-6 text-center">
          <p class="text-2xl font-semibold">
            {{ totalSummary.km.toFixed(1) }}
          </p>
          <p class="text-xs text-gray-500 mt-1">Kilometers</p>
        </div>

        <div class="bg-white border rounded-xl p-6 text-center">
          <p class="text-2xl font-semibold">
            {{ totalSummary.pts.toFixed(0) }}
          </p>
          <p class="text-xs text-gray-500 mt-1">Points</p>
        </div>

        <div class="bg-white border rounded-xl p-6 text-center">
          <p class="text-2xl font-semibold">
            {{ totalSummary.runs }}
          </p>
          <p class="text-xs text-gray-500 mt-1">Events</p>
        </div>
      </div>

      <!-- Streak -->
      <div class="bg-white border rounded-xl p-6 text-center">
        <p class="text-xs text-gray-500 mb-2">Current Streak</p>
        <p class="text-xl font-semibold">{{ streak }} Days</p>
      </div>

      <!-- Daily Activity -->
      <div>
        <h2 class="text-sm font-medium text-gray-600 mb-4">Daily Activity</h2>

        <div
          v-if="dailyStats.length === 0"
          class="bg-white border rounded-xl p-8 text-center text-gray-400"
        >
          No activity recorded this month.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="stat in dailyStats"
            :key="stat.date"
            class="bg-white border rounded-xl p-5"
          >
            <div class="flex justify-between mb-2">
              <span class="text-sm">
                {{ new Date(stat.date).toLocaleDateString("th-TH") }}
              </span>
              <span class="text-sm font-medium">
                {{ stat.km.toFixed(1) }} km
              </span>
            </div>

            <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-gray-900"
                :style="{ width: Math.min((stat.km / 15) * 100, 100) + '%' }"
              ></div>
            </div>

            <div class="text-xs text-gray-500 mt-2 text-right">
              {{ stat.count }} sessions • {{ stat.pts.toFixed(0) }} pts
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-xs text-gray-400 text-right">
        Last updated:
        {{ new Date().toLocaleString("th-TH") }}
      </div>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  display: none;
}
</style>
