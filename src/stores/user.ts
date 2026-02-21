// src/stores/user.ts
import { defineStore } from "pinia";
import { ref } from "vue";

export const useUserStore = defineStore("user", () => {
  const profile = ref<any>(null);
  const loading = ref(true);

  function setProfile(newProfile: any) {
    profile.value = newProfile;
  }

  function setLoading(val: boolean) {
    loading.value = val;
  }

  function isProfileLoaded(): boolean {
    return !loading.value && profile.value !== null;
  }

  return {
    profile,
    loading,
    setProfile,
    setLoading,
    isProfileLoaded,
  }; // ปิดปีกกาให้ถูกต้อง ห้ามมีเครื่องหมายเกิน
});
