import { ref } from "vue";

export const globalProfile = ref<any>(null);
export const globalLoading = ref(true);

export function setGlobalProfile(newProfile: any) {
  globalProfile.value = newProfile;
}

export function setGlobalLoading(val: boolean) {
  globalLoading.value = val;
}
