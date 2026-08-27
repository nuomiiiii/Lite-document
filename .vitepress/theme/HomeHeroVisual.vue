<script setup lang="ts">
import { withBase } from "vitepress";

const bannerSrc = withBase("/assets/lite-banner.svg?v=1");
const iconSrc = withBase("/assets/lite-icon.svg?v=1");
</script>

<template>
  <picture class="home-hero-visual">
    <source media="(min-width: 960px)" :srcset="bannerSrc" type="image/svg+xml" />
    <img
      :src="iconSrc"
      alt="Lite"
      width="512"
      height="512"
      fetchpriority="high"
    />
  </picture>
</template>
