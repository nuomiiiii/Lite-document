import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import AttributionNotice from "./AttributionNotice.vue";
import HomeHeroVisual from "./HomeHeroVisual.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "home-hero-image": () => h(HomeHeroVisual),
      "layout-bottom": () => h(AttributionNotice),
    }),
};
