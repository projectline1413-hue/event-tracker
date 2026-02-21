<script setup lang="ts">
import { onMounted } from "vue";
import { initLiff } from "./lib/liff";
import { getOrCreateProfile } from "./composables/useProfile";
import BottomNav from "./components/BottomNav.vue";
import {
  globalProfile,
  globalLoading,
  setGlobalProfile,
  setGlobalLoading,
} from "./composables/useGlobalUser";

onMounted(async () => {
  try {
    setGlobalLoading(true);
    const liffInstance = await initLiff();
    if (!liffInstance) return;

    const user = await liffInstance.getProfile();
    const dbProfile = await getOrCreateProfile(
      user.userId,
      user.displayName,
      user.pictureUrl || null,
    );

    setGlobalProfile(dbProfile);
  } catch (err) {
    console.error("App Initialize Error:", err);
  } finally {
    setGlobalLoading(false);
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#F5F7F6] text-gray-800 pb-24 font-kanit">
    <!-- Loading -->
    <div
      v-if="globalLoading"
      class="flex flex-col items-center justify-center h-screen"
    >
      <div
        class="w-10 h-10 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"
      ></div>
      <p class="mt-4 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- App -->
    <div v-else>
      <!-- Header -->
      <header
        class="px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-50"
      >
        <div class="flex justify-between items-center">
          <h1 class="text-lg font-semibold text-gray-900">Dashboard</h1>

          <div v-if="globalProfile" class="flex items-center gap-2">
            <img
              v-if="globalProfile.picture_url"
              :src="globalProfile.picture_url"
              class="w-8 h-8 rounded-full object-cover"
            />
            <div v-else class="w-8 h-8 rounded-full bg-gray-200"></div>

            <span class="text-sm font-medium truncate max-w-[100px]">
              {{ globalProfile.display_name }}
            </span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="px-4 py-4">
        <RouterView />
      </main>

      <!-- Bottom Navigation -->
      <BottomNav />
    </div>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap");

body {
  margin: 0;
  padding: 0;
  background-color: #f5f7f6;
  -webkit-tap-highlight-color: transparent;
}

.font-kanit {
  font-family: "Kanit", sans-serif;
}

::-webkit-scrollbar {
  display: none;
}
</style>
