import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Forzamos a Nitro a compilar utilizando el preset oficial de Vercel
      nitro({
        preset: "vercel",
      }),
    ],
  },
});
