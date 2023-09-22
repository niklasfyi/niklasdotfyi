import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import solidJs from "@astrojs/solid-js";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://www.niklas.fyi/",
  integrations: [sitemap(), robotsTxt({
    sitemap: ["https://www.niklas.fyi/sitemap-index.xml", "https://www.niklas.fyi/sitemap-0.xml"]
  }), solidJs(), UnoCSS({
    injectReset: true
  })],
  output: "server",
  adapter: cloudflare()
});