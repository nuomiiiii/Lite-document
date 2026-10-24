import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import HomeHeroVisual from "./HomeHeroVisual.vue";
import PlusBadge from "./PlusBadge.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("PlusBadge", PlusBadge);
  },
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "home-hero-image": () => h(HomeHeroVisual),
    }),
};
