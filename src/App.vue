<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initLiff } from './lib/liff'
import { getOrCreateProfile } from './composables/useProfile'

const loading = ref(true)
const profile = ref<any>(null)

onMounted(async () => {
  try {
    const liff = await initLiff()
    const user = await liff.getProfile()

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
  <div class="min-h-screen flex items-center justify-center bg-black text-white">
    <div v-if="loading">Loading...</div>
    <div v-else>
      <h1 class="text-3xl font-bold text-green-400">
        สวัสดี {{ profile?.display_name }}
      </h1>
    </div>
  </div>
</template>
