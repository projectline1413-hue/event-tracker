<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from "vue";
import { supabase } from "../lib/supabase";
import liff from "@line/liff";

interface Runner {
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
  total_distance: number;
  total_bonus: number;
  rank_position: number;
}

const myLineId = ref<string>("");
const allRunners = ref<Runner[]>([]);
const isLoading = ref<boolean>(true);
const searchQuery = ref<string>("");

const fetchRankData = async () => {
  isLoading.value = true;

  try {
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      myLineId.value = profile.userId;

      await supabase.from("profiles").upsert(
        {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl,
        },
        { onConflict: "line_user_id" },
      );
    }

    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("rank_position", { ascending: true });

    if (error) throw error;

    allRunners.value = data || [];
  } catch (err) {
    console.error("Leaderboard Fetch Error:", err);
  } finally {
    isLoading.value = false;
  }
};

const filteredRunners = computed(() => {
  if (!searchQuery.value.trim()) {
    return allRunners.value.slice(0, 20);
  }

  return allRunners.value.filter((runner) =>
    runner.display_name
      ?.toLowerCase()
      .includes(searchQuery.value.toLowerCase()),
  );
});

const scrollToMyRank = async () => {
  await nextTick();
  const el = document.getElementById(`runner-${myLineId.value}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

onMounted(fetchRankData);
</script>

<template>
  <div class="app-bg"></div>

  <div class="rank-container">
    <div class="control-bar">
      <div class="search-box">
        <span class="material-symbols-outlined icon-sm">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name..."
        />
      </div>

      <button class="my-rank-btn" @click="scrollToMyRank">
        <span class="material-symbols-outlined icon-sm">my_location</span>
        My Rank
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <span class="material-symbols-outlined spin"> progress_activity </span>
    </div>

    <main v-else class="rank-list">
      <div
        v-for="runner in filteredRunners"
        :key="runner.line_user_id"
        :id="`runner-${runner.line_user_id}`"
        class="rank-item"
        :class="{ 'is-user': runner.line_user_id === myLineId }"
      >
        <div class="rank-number">#{{ runner.rank_position }}</div>

        <div class="avatar">
          <img
            v-if="runner.picture_url"
            :src="runner.picture_url"
            loading="lazy"
            alt="User avatar"
          />
          <div v-else>
            {{ runner.display_name?.charAt(0) }}
          </div>
        </div>

        <div class="info">
          <div class="name">
            {{ runner.display_name }}
            <span v-if="runner.line_user_id === myLineId" class="badge">
              You
            </span>
          </div>
        </div>

        <!-- Distance moved to right -->
        <div class="distance-right">
          {{ Number(runner.total_distance).toFixed(1) }} km
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined");

.app-bg {
  position: fixed;
  inset: 0;
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
  z-index: -1;
}

.rank-container {
  padding: 2rem 1rem;
  font-family: "Prompt", sans-serif;
  color: #1f2937;
  max-width: 480px;
  margin: 0 auto;
}

.page-title {
  text-align: center;
  margin-bottom: 20px;
  font-weight: 600;
}

.control-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: white;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  gap: 6px;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-family: inherit;
}

.my-rank-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;
}

.my-rank-btn:hover {
  opacity: 0.9;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: white;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.rank-item:hover {
  transform: translateY(-2px);
}

.rank-item.is-user {
  border: 2px solid #10b981;
  background: #ecfdf5;
}

.rank-number {
  width: 60px;
  font-weight: 600;
  color: #374151;
}

.avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  overflow: hidden;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  background: #10b981;
  color: white;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 6px;
  margin-left: 6px;
}

.distance-right {
  margin-left: auto;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}

.icon-sm {
  font-size: 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
