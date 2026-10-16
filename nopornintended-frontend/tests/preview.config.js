import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import config from "../vite.config.js";

export default mergeConfig(config, {
  define: {
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      "http://127.0.0.1:8001/api",
    ),
  },
  resolve: {
    alias: [
      {
        find: /^\.\.\/component\/AgeGate$/,
        replacement: fileURLToPath(
          new URL("./fixtures/ConfirmedSession.jsx", import.meta.url),
        ),
      },
    ],
  },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
});
