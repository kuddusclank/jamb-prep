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

// Remove older global Hyperdrive injections on existing installations.
// The binding belongs to OpenNext's request context, not process-wide state.
for (const template of ["worker.js", "init.js"]) {
  const filename = path.resolve(__dirname, `../node_modules/@opennextjs/cloudflare/dist/cli/templates/${template}`);
  if (!fs.existsSync(filename)) continue;
  const original = fs.readFileSync(filename, "utf-8");
  const cleaned = original.replace(/\s*if \(env\?\.HYPERDRIVE\?\.connectionString\) \{\s*globalThis\.__HYPERDRIVE_CONN__ = env\.HYPERDRIVE\.connectionString;\s*process\.env\.HYPERDRIVE_CONNECTION_STRING = env\.HYPERDRIVE\.connectionString;\s*\}/g, "");
  if (cleaned !== original) fs.writeFileSync(filename, cleaned, "utf-8");
}
