<script setup lang="ts">
import { withBase } from "vitepress";

const bannerSrc = withBase("/assets/komari-banner.svg?v=1");
const iconSrc = withBase("/assets/komari-icon.svg?v=3");
</script>

<template>
  <picture class="home-hero-visual">
    <source media="(min-width: 960px)" :srcset="bannerSrc" type="image/svg+xml" />
    <img
      :src="iconSrc"
      alt="Komari"
      width="512"
      height="512"
      fetchpriority="high"
    />
  </picture>
</template>
