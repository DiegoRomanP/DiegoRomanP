import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://diegoromanp.github.io",
  base: "/DiegoRomanP/",
  output: "static",
  build: {
    assets: "_astro",
  },
});
