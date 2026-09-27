<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { SessionCommand, SessionViewDto } from "@focuslit/contracts";

type Locale = "zh" | "en";
const locale = ref<Locale>("zh");
const goal = ref("");
const session = ref<SessionViewDto>({
  phase: "idle",
  goal: "",
  durationMs: 0,
  remainingMs: 0,
  revision: 0,
});
const error = ref("");
let unsubscribe: (() => void) | undefined;

const copy = computed(() =>
  locale.value === "zh"
    ? {
        companion: "和你一起，专注这一段。",
        goal: "这一小时想做什么？",
        example: "例如：完成两道动态规划题",
        start: "开始 60 分钟",
        pause: "暂停",
        resume: "继续",
        end: "结束",
        idle: "准备开始",
        running: "正在陪你完成",
        paused: "已暂停",
        ended: "这一段结束了",
        browser: "浏览器监测尚未连接",
        prototype: "小猫是临时占位形象",
        failure: "操作未完成，请重试。",
      }
    : {
        companion: "Here with you for this session.",
        goal: "What will you work on this hour?",
        example: "For example: solve two dynamic programming problems",
        start: "Start 60 minutes",
        pause: "Pause",
        resume: "Resume",
        end: "End session",
        idle: "Ready to begin",
        running: "Working alongside you",
        paused: "Paused",
        ended: "Session ended",
        browser: "Browser monitoring is not connected",
        prototype: "Temporary cat placeholder",
        failure: "That action did not finish. Please try again.",
      },
);

const status = computed(() => copy.value[session.value.phase]);
const remaining = computed(() => {
  const totalSeconds = Math.ceil(session.value.remainingMs / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
});

async function send(command: SessionCommand) {
  error.value = "";
  try {
    session.value = await window.focuslit.command(command);
  } catch {
    error.value = copy.value.failure;
  }
}

function start() {
  if (goal.value.trim())
    void send({ type: "start", goal: goal.value, durationMinutes: 60 });
}

onMounted(async () => {
  unsubscribe = window.focuslit.onSessionChanged(
    (value) => (session.value = value),
  );
  try {
    session.value = await window.focuslit.getSession();
  } catch {
    error.value = copy.value.failure;
  }
});
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <main class="panel">
    <header class="topbar">
      <span class="brand">FocusLit</span>
      <div class="language" role="group" aria-label="Language / 语言">
        <button
          type="button"
          :aria-pressed="locale === 'zh'"
          @click="locale = 'zh'"
        >
          中文
        </button>
        <button
          type="button"
          :aria-pressed="locale === 'en'"
          @click="locale = 'en'"
        >
          EN
        </button>
      </div>
    </header>

    <div class="cat-stage">
      <div class="cat" role="img" :aria-label="copy.prototype">
        <div class="cat-ear left"></div>
        <div class="cat-ear right"></div>
        <div class="cat-face">
          <span class="eye left"></span><span class="eye right"></span>
          <span class="nose"></span>
        </div>
      </div>
      <p class="placeholder">{{ copy.prototype }}</p>
    </div>

    <section class="session" aria-live="polite">
      <p class="eyebrow">{{ status }}</p>
      <h1>
        {{
          session.phase === "running" || session.phase === "paused"
            ? session.goal
            : copy.companion
        }}
      </h1>
      <p
        v-if="session.phase === 'running' || session.phase === 'paused'"
        class="timer"
      >
        {{ remaining }}
      </p>

      <form
        v-if="session.phase === 'idle' || session.phase === 'ended'"
        @submit.prevent="start"
      >
        <label for="goal">{{ copy.goal }}</label>
        <input
          id="goal"
          v-model="goal"
          type="text"
          maxlength="240"
          :placeholder="copy.example"
          autocomplete="off"
        />
        <button class="primary" type="submit" :disabled="!goal.trim()">
          {{ copy.start }}
        </button>
      </form>
      <div v-else class="actions">
        <button
          v-if="session.phase === 'running'"
          class="primary"
          type="button"
          @click="send({ type: 'pause' })"
        >
          {{ copy.pause }}
        </button>
        <button
          v-else
          class="primary"
          type="button"
          @click="send({ type: 'resume' })"
        >
          {{ copy.resume }}
        </button>
        <button class="secondary" type="button" @click="send({ type: 'end' })">
          {{ copy.end }}
        </button>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </section>

    <footer><span class="status-dot"></span>{{ copy.browser }}</footer>
  </main>
</template>
