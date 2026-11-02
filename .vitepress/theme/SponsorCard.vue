<script setup lang="ts">
import { withBase } from "vitepress";

withDefaults(defineProps<{ placement?: "aside" | "mobile" }>(), {
  placement: "aside",
});

const logoSrc = withBase("/assets/sponsors/ppflight.ico");
</script>

<template>
  <section
    class="sponsor-placement"
    :class="`sponsor-placement--${placement}`"
    aria-label="赞助商"
  >
    <a
      class="sponsor-card"
      href="https://www.ppflight.com/?aff=1032"
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label="赞助商 PPFlight：签三网精品 做优质落地，访问网站（新窗口）"
    >
      <img
        class="sponsor-card__logo"
        :src="logoSrc"
        alt="PPFlight"
        width="40"
        height="40"
        decoding="async"
      />
      <div class="sponsor-card__copy">
        <div class="sponsor-card__heading">
          <span class="sponsor-card__name">PPFlight</span>
          <span class="sponsor-card__label">赞助商</span>
        </div>
        <p class="sponsor-card__slogan">签三网精品 做优质落地</p>
      </div>
      <svg class="sponsor-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </a>
  </section>
</template>

<style scoped>
.sponsor-placement--aside {
  margin-bottom: 24px;
}

.sponsor-placement--mobile {
  margin-bottom: 28px;
}

.sponsor-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.sponsor-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.sponsor-card:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

.sponsor-card__logo {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 9px;
  object-fit: contain;
  background: #fff;
}

.sponsor-card__copy {
  flex: 1;
  min-width: 0;
}

.sponsor-card__heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sponsor-card__name {
  font-size: 16px;
  font-weight: 650;
  line-height: 24px;
  white-space: nowrap;
}

.sponsor-card__label {
  padding: 0 5px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  font-size: 10px;
  line-height: 17px;
  white-space: nowrap;
}

.sponsor-card__slogan {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
}

.sponsor-card__arrow {
  flex: 0 0 16px;
  color: var(--vp-c-text-2);
}

.sponsor-placement--aside .sponsor-card {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 8px 10px;
  padding: 14px;
}

.sponsor-placement--aside .sponsor-card__copy {
  display: contents;
}

.sponsor-placement--aside .sponsor-card__heading {
  flex-wrap: wrap;
  gap: 4px 8px;
}

.sponsor-placement--aside .sponsor-card__slogan {
  grid-column: 1 / -1;
  margin: 0;
}

.sponsor-placement--aside .sponsor-card__arrow {
  position: absolute;
  top: 16px;
  right: 12px;
  width: 13px;
  height: 13px;
}

@media (min-width: 1280px) {
  .sponsor-placement--mobile {
    display: none;
  }
}
</style>
