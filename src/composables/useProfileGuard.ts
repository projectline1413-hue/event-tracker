import { watch, ref } from "vue";
import { useUserStore } from "../stores/user";

/**
 * Guard to ensure profile is loaded before proceeding.
 * Prevents null reference errors when trying to access userStore.profile
 *
 * Usage:
 * const isReady = useProfileGuard()
 *
 * In template:
 * <div v-if="isReady">
 *   <!-- Your code that uses userStore.profile -->
 * </div>
 */
export function useProfileGuard() {
  const userStore = useUserStore();
  const isReady = ref(false);

  // Watch for profile to be loaded and set flag
  watch(
    () => userStore.isProfileLoaded(),
    (loaded) => {
      isReady.value = loaded;
    },
    { immediate: true },
  );

  return isReady;
}

/**
 * Prevents async function from running until profile is loaded
 *
 * Usage:
 * const { waitForProfile, isReady } = useProfileGuardAsync()
 *
 * onMounted(async () => {
 *   await waitForProfile();
 *   // Now you can safely use userStore.profile
 * })
 */
export function useProfileGuardAsync() {
  const userStore = useUserStore();
  const isReady = ref(false);

  const waitForProfile = () => {
    return new Promise<void>((resolve) => {
      if (userStore.isProfileLoaded()) {
        isReady.value = true;
        resolve();
        return;
      }

      const stop = watch(
        () => userStore.isProfileLoaded(),
        (loaded) => {
          if (loaded) {
            isReady.value = true;
            stop();
            resolve();
          }
        },
      );
    });
  };

  return { waitForProfile, isReady };
}
