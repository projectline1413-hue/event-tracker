<script setup lang="ts">
import { ref, computed } from "vue";
import { supabase } from "../lib/supabase";
import liff from "@line/liff";

const loading = ref(false);
const submitted = ref(false);
const lineUserId = ref("");
const answers = ref<(number | null)[]>([null, null, null, null, null, null]);

const questions = [
  {
    text: "โดยปกติท่านสูบบุหรี่กี่มวนต่อวัน?",
    options: [
      { label: "10 หรือน้อยกว่า", value: 0, code: "A" },
      { label: "11–20 มวน", value: 1, code: "B" },
      { label: "21–30 มวน", value: 2, code: "C" },
      { label: "31 มวนขึ้นไป", value: 3, code: "D" },
    ],
  },
  {
    text: "หลังตื่นนอน ท่านสูบบุหรี่มวนแรกเมื่อใด?",
    options: [
      { label: "ภายใน 5 นาที", value: 3, code: "A" },
      { label: "6–30 นาที", value: 2, code: "B" },
      { label: "31–60 นาที", value: 1, code: "C" },
      { label: "มากกว่า 60 นาที", value: 0, code: "D" },
    ],
  },
  {
    text: "ท่านสูบบุหรี่หนักในชั่วโมงแรกหลังตื่นนอนหรือไม่?",
    options: [
      { label: "ใช่", value: 1, code: "A" },
      { label: "ไม่ใช่", value: 0, code: "B" },
    ],
  },
  {
    text: "บุหรี่มวนที่ท่านคิดว่าเลิกยากที่สุดคือ?",
    options: [
      { label: "มวนแรกตอนเช้า", value: 1, code: "A" },
      { label: "มวนอื่นๆ", value: 0, code: "B" },
    ],
  },
  {
    text: "ท่านรู้สึกอึดอัดเมื่ออยู่ในเขตปลอดบุหรี่หรือไม่?",
    options: [
      { label: "ใช่", value: 1, code: "A" },
      { label: "ไม่ใช่", value: 0, code: "B" },
    ],
  },
  {
    text: "ท่านยังสูบบุหรี่แม้เจ็บป่วยจนต้องนอนพักหรือไม่?",
    options: [
      { label: "ใช่", value: 1, code: "A" },
      { label: "ไม่ใช่", value: 0, code: "B" },
    ],
  },
];

const totalScore = computed<number>(() =>
  answers.value.reduce((sum: number, val) => sum + (val ?? 0), 0),
);

const level = computed(() => {
  const s = totalScore.value;
  if (s <= 2) return "ต่ำมาก";
  if (s <= 4) return "ต่ำ";
  if (s === 5) return "ปานกลาง";
  if (s <= 7) return "สูง";
  return "สูงมาก";
});

const allAnswered = computed(() => answers.value.every((a) => a !== null));
const answeredCount = computed(
  () => answers.value.filter((a) => a !== null).length,
);

const selectOption = (questionIndex: number, value: number) => {
  answers.value[questionIndex] = value;
};

const submitTest = async () => {
  if (!allAnswered.value || loading.value) return;
  loading.value = true;
  try {
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    lineUserId.value = profile.userId;
    const { error } = await supabase.from("nicotine_assessments").insert([
      {
        line_user_id: lineUserId.value,
        score: totalScore.value,
        level: level.value,
      },
    ]);
    if (!error) {
      submitted.value = true;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const resetTest = () => {
  submitted.value = false;
  answers.value = [null, null, null, null, null, null];
  window.scrollTo({ top: 0, behavior: "smooth" });
};
</script>

<template>
  <div class="page-layout" :class="{ 'bg-pastel-green': !submitted }">
    <div class="content-wrapper">
      <div v-if="!submitted" class="scroll-container">
        <nav class="top-nav">
          <button class="nav-circle-btn">〈</button>
          <span class="nav-title">Assessment Quiz</span>
          <button class="nav-circle-btn">⊞</button>
        </nav>

        <div class="main-content">
          <div class="quiz-info-header">
            <span class="question-count">Progress: {{ answeredCount }}/6</span>
            <div class="segment-progress">
              <div
                v-for="i in 6"
                :key="i"
                class="segment"
                :class="{ active: i <= answeredCount }"
              ></div>
            </div>
          </div>

          <div class="questions-scroll">
            <div v-for="(q, qIdx) in questions" :key="qIdx" class="quiz-card">
              <div class="card-illustration">🍃</div>
              <h2 class="question-title">{{ q.text }}</h2>
              <p class="instruction">กรุณาเลือกหนึ่งคำตอบ</p>

              <div
                class="options-grid"
                :class="{ 'two-cols': q.options.length > 2 }"
              >
                <button
                  v-for="(option, oIdx) in q.options"
                  :key="oIdx"
                  class="option-pill"
                  :class="{ 'is-selected': answers[qIdx] === option.value }"
                  @click="selectOption(qIdx, option.value)"
                >
                  <span class="option-code">{{ option.code }}.</span>
                  <span class="option-text">{{ option.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="quiz-footer">
            <div class="footer-stats" v-if="answeredCount > 0">
              <div class="stat-item">
                <span class="stat-label">Score</span>
                <span class="stat-val">{{ totalScore }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-label">Level</span>
                <span class="stat-val highlight">{{ level }}</span>
              </div>
            </div>

            <button
              class="action-btn-main"
              :disabled="!allAnswered || loading"
              @click="submitTest"
            >
              <span v-if="!loading">{{
                allAnswered ? "ส่งผลการประเมิน" : "กรุณาตอบให้ครบทุกข้อ"
              }}</span>
              <span v-else class="spinner"></span>
              <span class="arrow-icon">〉</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="success-container">
        <div class="success-content">
          <div class="profile-header">
            <div class="avatar-ring">✅</div>
            <h3>Assessment Complete!</h3>
          </div>

          <div class="reward-card">
            <div class="reward-content">
              <p>ระดับการติดของคุณ</p>
              <h4>{{ level }}</h4>
            </div>
            <div class="reward-badge">⭐</div>
          </div>

          <div class="stats-row">
            <div class="mini-card">
              <span class="label">คะแนนรวม</span>
              <span class="value green-text">{{ totalScore }}</span>
            </div>
            <div class="mini-card">
              <span class="label">สถานะ</span>
              <span class="value">บันทึกแล้ว</span>
            </div>
          </div>

          <button class="btn-outline" @click="resetTest">
            ทำแบบประเมินอีกครั้ง
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");

.page-layout {
  font-family: "Plus Jakarta Sans", sans-serif;
  height: 100dvh;
  width: 100vw;
  display: flex;
  justify-content: center; /* จัดกึ่งกลางแนวนอน */
  overflow: hidden;
}

.bg-pastel-green {
  background-color: #d1f2e6;
}

/* หัวใจหลักของ Responsive: ล็อคความกว้างแต่เต็มจอพื้นหลัง */
.content-wrapper {
  width: 100%;
  max-width: 500px; /* ขนาดแอปมือถือมาตรฐาน */
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Nav Bar */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}
.nav-circle-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: white;
  color: #555;
  display: grid;
  place-items: center;
}
.nav-title {
  font-weight: 700;
  font-size: 16px;
  color: #2d5a4c;
}

/* Progress Section */
.quiz-info-header {
  padding: 0 20px;
  margin-bottom: 25px;
}
.question-count {
  font-size: 14px;
  font-weight: 600;
  color: #2d5a4c;
  display: block;
  margin-bottom: 10px;
}
.segment-progress {
  display: flex;
  gap: 8px;
}
.segment {
  height: 8px;
  flex: 1;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
}
.segment.active {
  background: #56c596;
}

/* Question Section */
.questions-scroll {
  padding: 0 20px 160px; /* เพิ่ม padding ล่างกันเท้าบัฟเฟอร์บัง */
  display: flex;
  flex-direction: column;
  gap: 35px;
}
.quiz-card {
  color: #2d5a4c;
}
.card-illustration {
  font-size: 32px;
  margin-bottom: 10px;
}
.question-title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 8px;
}
.instruction {
  font-size: 14px;
  opacity: 0.7;
}

/* Options Grid: ปรับให้สมดุลทั้งจอเล็กและใหญ่ */
.options-grid {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}
.options-grid.two-cols {
  grid-template-columns: repeat(2, 1fr);
}

.option-pill {
  background: white;
  border: 2px solid white;
  padding: 16px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.option-pill.is-selected {
  background: #a8e6cf;
  border-color: #56c596;
  transform: translateY(-2px);
}
.option-code {
  font-weight: 800;
}
.option-text {
  font-size: 14px;
  color: #333;
}

/* Footer: ล็อคอยู่ด้านล่างของ Wrapper */
.quiz-footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 20px 20px 30px;
  background: linear-gradient(transparent, #d1f2e6 40%);
  pointer-events: none; /* เพื่อให้เลื่อนการ์ดที่อยู่ข้างหลังได้ */
}
.quiz-footer > * {
  pointer-events: auto;
}

.footer-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 15px;
}
.stat-val {
  font-weight: 700;
  font-size: 18px;
  color: #2d5a4c;
}
.stat-val.highlight {
  color: #56c596;
}

.action-btn-main {
  width: 100%;
  padding: 18px;
  background: #56c596;
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 20px rgba(86, 197, 150, 0.3);
}

/* Success Container */
.success-container {
  background: white;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
.success-content {
  width: 100%;
  text-align: center;
}
.reward-card {
  background: #a8e6cf;
  border-radius: 25px;
  padding: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 30px 0;
}
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
}
.mini-card {
  flex: 1;
  background: #f9f9f9;
  padding: 20px;
  border-radius: 20px;
}
.green-text {
  color: #56c596;
  font-weight: 700;
}
.btn-outline {
  padding: 14px 25px;
  border: 1px solid #ddd;
  border-radius: 14px;
  background: none;
  color: #888;
  cursor: pointer;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid white;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: rotation 1s linear infinite;
}
@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
