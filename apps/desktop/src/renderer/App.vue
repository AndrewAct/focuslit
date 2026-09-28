<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { SessionCommand, SessionViewDto } from "@focuslit/contracts";
import catHappyV1 from "./assets/cat/focuslit-cat-happy-v1.png";

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
        duration: "时长",
        duration1h: "1 小时",
        duration3h: "3 小时",
        durationCustom: "自定义",
        durationCustomLabel: "自定义时长（分钟）",
        startPrefix: "开始",
        minutesUnit: "分钟",
        pause: "暂停",
        resume: "继续",
        end: "结束",
        idle: "准备开始",
        running: "正在陪你完成",
        paused: "已暂停",
        ended: "这一段结束了",
        browser: "浏览器监测尚未连接",
        catAlt: "FocusLit 猫咪，愉悦表情",
        prototype: "更多表情与互动开发中",
        failure: "操作未完成，请重试。",
        expandCat: "点击展开",
        collapseCat: "点击收起",
        showTimerToggle: "收起时在猫咪下方显示倒计时",
      }
    : {
        companion: "Here with you for this session.",
        goal: "What will you work on this hour?",
        example: "For example: solve two dynamic programming problems",
        duration: "Duration",
        duration1h: "1 hour",
        duration3h: "3 hours",
        durationCustom: "Custom",
        durationCustomLabel: "Custom duration (minutes)",
        startPrefix: "Start",
        minutesUnit: "minutes",
        pause: "Pause",
        resume: "Resume",
        end: "End session",
        idle: "Ready to begin",
        running: "Working alongside you",
        paused: "Paused",
        ended: "Session ended",
        browser: "Browser monitoring is not connected",
        catAlt: "FocusLit cat, content expression",
        prototype: "More expressions and interactions coming soon",
        failure: "That action did not finish. Please try again.",
        expandCat: "Click to expand",
        collapseCat: "Click to collapse",
        showTimerToggle: "Show countdown under the cat when collapsed",
      },
);

const expanded = ref(false);

// Optional per PRODUCT_DESIGN.md: some people find a visible countdown
// distracting, so this stays off-window state (localStorage) rather than a
// server preference, and defaults on since it was explicitly requested.
const showTimerWhenCollapsed = ref(true);
try {
  const stored = localStorage.getItem("focuslit:showTimerWhenCollapsed");
  if (stored !== null) showTimerWhenCollapsed.value = stored === "true";
} catch {
  // Storage unavailable (e.g. restricted profile) — keep the default.
}
watch(showTimerWhenCollapsed, (value) => {
  try {
    localStorage.setItem("focuslit:showTimerWhenCollapsed", String(value));
  } catch {
    // Best-effort only; failing to persist isn't fatal.
  }
});

const collapsedTimerVisible = computed(
  () =>
    !expanded.value &&
    showTimerWhenCollapsed.value &&
    (session.value.phase === "running" || session.value.phase === "paused"),
);
const windowMode = computed(() =>
  expanded.value
    ? "expanded"
    : collapsedTimerVisible.value
      ? "collapsed-timer"
      : "collapsed",
);
watch(windowMode, (mode) => void window.focuslit.setWindowMode(mode), {
  immediate: true,
});

function toggleExpanded() {
  expanded.value = !expanded.value;
}

// Dragging is done manually (moving the OS window via IPC on every pointer
// move) instead of `-webkit-app-region: drag`: that native region reliably
// swallows the pointerup on a plain click, so a click-to-expand cat never
// registered. Manual dragging keeps click detection in ordinary JS events.
type DragState = {
  pointerId: number;
  lastScreenX: number;
  lastScreenY: number;
  startScreenX: number;
  startScreenY: number;
  startTime: number;
};
let dragState: DragState | null = null;

function onCatPointerDown(event: PointerEvent) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  dragState = {
    pointerId: event.pointerId,
    lastScreenX: event.screenX,
    lastScreenY: event.screenY,
    startScreenX: event.screenX,
    startScreenY: event.screenY,
    startTime: performance.now(),
  };
}

function onCatPointerMove(event: PointerEvent) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const dx = event.screenX - dragState.lastScreenX;
  const dy = event.screenY - dragState.lastScreenY;
  if (dx === 0 && dy === 0) return;
  dragState.lastScreenX = event.screenX;
  dragState.lastScreenY = event.screenY;
  window.focuslit.moveBy(dx, dy);
}

function onCatPointerUp(event: PointerEvent) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const totalDx = event.screenX - dragState.startScreenX;
  const totalDy = event.screenY - dragState.startScreenY;
  const elapsed = performance.now() - dragState.startTime;
  dragState = null;
  if (Math.hypot(totalDx, totalDy) < 4 && elapsed < 500) void toggleExpanded();
}

function onCatPointerCancel(event: PointerEvent) {
  if (dragState?.pointerId === event.pointerId) dragState = null;
}

const status = computed(() => copy.value[session.value.phase]);
const remaining = computed(() => {
  const totalSeconds = Math.ceil(session.value.remainingMs / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
});

type DurationPreset = 60 | 180 | "custom";
const durationPreset = ref<DurationPreset>(60);
const customMinutes = ref(60);
// Mirrors the contract's `z.number().int().min(1).max(180)` so an invalid
// custom value never reaches session:command and gets silently rejected.
const durationMinutes = computed(() => {
  if (durationPreset.value !== "custom") return durationPreset.value;
  const rounded = Math.round(customMinutes.value);
  return Math.min(180, Math.max(1, Number.isFinite(rounded) ? rounded : 60));
});
const startLabel = computed(
  () =>
    `${copy.value.startPrefix} ${durationMinutes.value} ${copy.value.minutesUnit}`,
);

function selectDurationPreset(preset: DurationPreset) {
  if (preset === "custom" && durationPreset.value !== "custom") {
    customMinutes.value = durationMinutes.value;
  }
  durationPreset.value = preset;
}

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
    void send({
      type: "start",
      goal: goal.value,
      durationMinutes: durationMinutes.value,
    });
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
  <main class="stage">
    <div class="surface" :class="{ card: expanded }">
      <header v-if="expanded" class="topbar">
        <span class="brand">FocusLit</span>
        <div
          class="language toggle-group"
          role="group"
          aria-label="Language / 语言"
        >
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

      <div
        class="cat-wrap"
        role="button"
        tabindex="0"
        :aria-label="expanded ? copy.collapseCat : copy.expandCat"
        @pointerdown="onCatPointerDown"
        @pointermove="onCatPointerMove"
        @pointerup="onCatPointerUp"
        @pointercancel="onCatPointerCancel"
        @keydown.enter="toggleExpanded"
        @keydown.space.prevent="toggleExpanded"
      >
        <img
          class="cat"
          :class="{ small: expanded }"
          :src="catHappyV1"
          :alt="copy.catAlt"
        />
        <p v-if="collapsedTimerVisible" class="floating-timer">
          {{ remaining }}
        </p>
        <p v-else-if="!expanded" class="hint">{{ copy.prototype }}</p>
      </div>

      <section v-if="expanded" class="session" aria-live="polite">
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

          <label id="duration-label">{{ copy.duration }}</label>
          <div
            class="duration toggle-group"
            role="group"
            aria-labelledby="duration-label"
          >
            <button
              type="button"
              :aria-pressed="durationPreset === 60"
              @click="selectDurationPreset(60)"
            >
              {{ copy.duration1h }}
            </button>
            <button
              type="button"
              :aria-pressed="durationPreset === 180"
              @click="selectDurationPreset(180)"
            >
              {{ copy.duration3h }}
            </button>
            <button
              type="button"
              :aria-pressed="durationPreset === 'custom'"
              @click="selectDurationPreset('custom')"
            >
              {{ copy.durationCustom }}
            </button>
            <input
              v-if="durationPreset === 'custom'"
              v-model.number="customMinutes"
              class="duration-input"
              type="number"
              min="1"
              max="180"
              :aria-label="copy.durationCustomLabel"
            />
          </div>

          <button class="primary" type="submit" :disabled="!goal.trim()">
            {{ startLabel }}
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
          <button
            class="secondary"
            type="button"
            @click="send({ type: 'end' })"
          >
            {{ copy.end }}
          </button>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <label class="timer-toggle">
          <input type="checkbox" v-model="showTimerWhenCollapsed" />
          {{ copy.showTimerToggle }}
        </label>
      </section>

      <footer v-if="expanded">
        <span class="status-dot"></span>{{ copy.browser }}
      </footer>
    </div>
  </main>
</template>
