<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initLiff } from './lib/liff'
import { getOrCreateProfile } from './composables/useProfile'

const loading = ref(true)
const profile = ref<any>(null)

onMounted(async () => {
  try {
    const liffInstance = await initLiff()
    if (!liffInstance) return

    const user = await liffInstance.getProfile()

    const dbProfile = await getOrCreateProfile(
      user.userId,
      user.displayName
    )

    profile.value = dbProfile
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-black text-white pb-20">
    <div v-if="loading" class="flex items-center justify-center h-screen">
      <div class="animate-pulse text-green-400">Loading...</div>
    </div>
    
    <div v-else>
      <!-- Header Area -->
      <header class="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 sticky top-0 backdrop-blur-md z-10">
        <h1 class="text-xl font-bold bg-linear-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Run Tracker
        </h1>
        <div class="text-sm text-gray-400">
          Hi, {{ profile?.display_name }}
        </div>
      </header>

      <!-- Page Content -->
      <main>
        <RouterView />
      </main>

      <!-- Bottom Navigation -->
      <nav class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around p-2 pb-6 z-20">
        <RouterLink 
          to="/"
          class="flex flex-col items-center p-2 transition-colors text-gray-500"
          active-class="!text-green-400"
        >
          <span class="text-xs mt-1">Join</span>
        </RouterLink>
        <RouterLink 
          to="/info"
          class="flex flex-col items-center p-2 transition-colors text-gray-500"
          active-class="!text-blue-400"
        >
          <span class="text-xs mt-1">Info</span>
        </RouterLink>
        <RouterLink 
          to="/rank"
          class="flex flex-col items-center p-2 transition-colors text-gray-500"
          active-class="!text-yellow-400"
        >
          <span class="text-xs mt-1">Rank</span>
        </RouterLink>
        <RouterLink 
          to="/create-party"
          class="flex flex-col items-center p-2 transition-colors text-gray-500"
          active-class="!text-purple-400"
        >
          <span class="text-xs mt-1">Party</span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
