<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const visible = ref(false);
const dismissKey = "komari-lite-attribution-dismissed-at";
const seenKey = "komari-lite-attribution-seen";
const dismissDuration = 7 * 24 * 60 * 60 * 1000;
let closeTimer: number | undefined;
let showTimer: number | undefined;

function storageGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
}

function wasDismissedRecently() {
  const dismissedAt = Number(storageGet(localStorage, dismissKey));
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < dismissDuration;
}

function close(persist = false) {
  visible.value = false;
  if (closeTimer) window.clearTimeout(closeTimer);
  if (persist) storageSet(localStorage, dismissKey, String(Date.now()));
}

onMounted(() => {
  const preview = import.meta.env.DEV && new URLSearchParams(location.search).has("attribution-preview");
  if (!preview) {
    if (wasDismissedRecently() || storageGet(sessionStorage, seenKey)) return;
    storageSet(sessionStorage, seenKey, "1");
  }

  showTimer = window.setTimeout(() => {
    visible.value = true;
    closeTimer = window.setTimeout(() => close(), 20000);
  }, 350);
});

onBeforeUnmount(() => {
  if (showTimer) window.clearTimeout(showTimer);
  if (closeTimer) window.clearTimeout(closeTimer);
});
</script>

<template>
  <Transition name="attribution-notice">
    <aside v-if="visible" class="attribution-notice" role="status" aria-live="polite">
      <span class="attribution-notice__accent" aria-hidden="true" />
      <div class="attribution-notice__content">
        <span class="attribution-notice__label">特别致谢</span>
        <p>感谢 Geekertao 为本文档中国大陆访问提供支持。</p>
      </div>
      <a
        class="attribution-notice__action"
        href="https://github.com/Geekertao"
        target="_blank"
        rel="noreferrer"
      >
        查看主页
      </a>
      <button
        class="attribution-notice__close"
        type="button"
        title="关闭提示"
        aria-label="关闭提示"
        @click="close(true)"
      >
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.attribution-notice {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 60;
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto 36px;
  gap: 12px;
  align-items: center;
  width: min(560px, calc(100vw - 40px));
  padding: 12px 10px 12px 0;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  box-shadow: 0 12px 28px rgba(23, 33, 43, 0.12);
  color: var(--vp-c-text-1);
}

.attribution-notice__accent {
  align-self: stretch;
  border-radius: 0 4px 4px 0;
  background: var(--vp-c-brand-1);
}

.attribution-notice__content {
  min-width: 0;
}

.attribution-notice__label {
  display: block;
  margin-bottom: 2px;
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  letter-spacing: 0;
}

.attribution-notice__content p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 22px;
}

.attribution-notice__action {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
}

.attribution-notice__action::after {
  margin-left: 6px;
  content: "↗";
}

.attribution-notice__action:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-2);
}

.attribution-notice__close {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 21px;
  line-height: 1;
}

.attribution-notice__close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.attribution-notice__action:focus-visible,
.attribution-notice__close:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.attribution-notice-enter-active,
.attribution-notice-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.attribution-notice-enter-from,
.attribution-notice-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 640px) {
  .attribution-notice {
    right: 12px;
    bottom: 12px;
    left: 12px;
    grid-template-columns: 3px minmax(0, 1fr) 32px;
    gap: 10px;
    width: auto;
    padding: 11px 9px 11px 0;
  }

  .attribution-notice__accent {
    grid-row: 1 / 3;
  }

  .attribution-notice__content {
    grid-column: 2;
    grid-row: 1;
  }

  .attribution-notice__action {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
  }

  .attribution-notice__close {
    grid-column: 3;
    grid-row: 1;
    align-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .attribution-notice-enter-active,
  .attribution-notice-leave-active {
    transition: none;
  }
}
</style>
