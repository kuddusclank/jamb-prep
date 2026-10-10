import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Patch load-manifest.js for Next.js 16 preview-props
const manifestPlugin = path.resolve(__dirname, "../node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js");
if (fs.existsSync(manifestPlugin)) {
  let content = fs.readFileSync(manifestPlugin, "utf-8");
  let modified = false;

  if (content.includes("required-server-files,prefetch-hints}.json")) {
    content = content.replace(
      "required-server-files,prefetch-hints}.json",
      "required-server-files,prefetch-hints,preview-props}.json"
    );
    modified = true;
  }

  if (content.includes('p.endsWith("prefetch-hints")') && !content.includes('p.endsWith("preview-props")')) {
    content = content.replace(
      'p.endsWith("prefetch-hints")',
      'p.endsWith("prefetch-hints") ||\n        p.endsWith("preview-props")'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(manifestPlugin, content, "utf-8");
    console.log("Successfully patched @opennextjs/cloudflare for Next.js 16 preview-props.");
  }
}

// 2. Patch templates/worker.js to bind HYPERDRIVE connectionString to globalThis and process.env
const workerTemplate = path.resolve(__dirname, "../node_modules/@opennextjs/cloudflare/dist/cli/templates/worker.js");
if (fs.existsSync(workerTemplate)) {
  let content = fs.readFileSync(workerTemplate, "utf-8");
  if (!content.includes("__HYPERDRIVE_CONN__")) {
    content = content.replace(
      "async fetch(request, env, ctx) {",
      `async fetch(request, env, ctx) {
        if (env?.HYPERDRIVE?.connectionString) {
            globalThis.__HYPERDRIVE_CONN__ = env.HYPERDRIVE.connectionString;
            process.env.HYPERDRIVE_CONNECTION_STRING = env.HYPERDRIVE.connectionString;
        }`
    );
    fs.writeFileSync(workerTemplate, content, "utf-8");
    console.log("Successfully patched @opennextjs/cloudflare templates/worker.js for Hyperdrive injection.");
  }
}

// 3. Patch templates/init.js for Hyperdrive context preservation
const initTemplate = path.resolve(__dirname, "../node_modules/@opennextjs/cloudflare/dist/cli/templates/init.js");
if (fs.existsSync(initTemplate)) {
  let content = fs.readFileSync(initTemplate, "utf-8");
  if (!content.includes("__HYPERDRIVE_CONN__")) {
    content = content.replace(
      "init(request, env);",
      `init(request, env);
    if (env?.HYPERDRIVE?.connectionString) {
        globalThis.__HYPERDRIVE_CONN__ = env.HYPERDRIVE.connectionString;
        process.env.HYPERDRIVE_CONNECTION_STRING = env.HYPERDRIVE.connectionString;
    }`
    );
    fs.writeFileSync(initTemplate, content, "utf-8");
    console.log("Successfully patched @opennextjs/cloudflare templates/init.js for Hyperdrive injection.");
  }
}
