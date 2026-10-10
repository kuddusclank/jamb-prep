import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.resolve(__dirname, "../node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js");

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, "utf-8");
  let modified = false;

  // 1. Add preview-props to glob pattern if missing
  if (content.includes("required-server-files,prefetch-hints}.json")) {
    content = content.replace(
      "required-server-files,prefetch-hints}.json",
      "required-server-files,prefetch-hints,preview-props}.json"
    );
    modified = true;
  }

  // 2. Add preview-props to fallback list if missing
  if (content.includes('p.endsWith("prefetch-hints")') && !content.includes('p.endsWith("preview-props")')) {
    content = content.replace(
      'p.endsWith("prefetch-hints")',
      'p.endsWith("prefetch-hints") ||\n        p.endsWith("preview-props")'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(targetFile, content, "utf-8");
    console.log("Successfully patched @opennextjs/cloudflare for Next.js 16 preview-props.");
  }
}
