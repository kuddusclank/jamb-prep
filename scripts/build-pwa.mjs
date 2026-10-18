import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'out');
const template = await readFile(path.join(root, 'public/sw.js'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(out, 'site.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || manifest.scope !== '/' || manifest.id !== '/') throw new Error('Invalid PWA identity');
const required = ['offline.html', 'icon-192.png', 'icon-512.png', 'lecterniq-mark.svg'];
const hash = createHash('sha256').update(template);
for (const name of required) {
  if (!(await stat(path.join(out, name))).isFile()) throw new Error(`Missing ${name}`);
  hash.update(await readFile(path.join(out, name)));
}
hash.update(await readFile(path.join(out, 'index.html')));
const buildId = hash.digest('hex').slice(0, 20);
await writeFile(path.join(out, 'sw.js'), template.replace('__PWA_BUILD_ID__', buildId));
await writeFile(path.join(out, 'pwa-build.json'), JSON.stringify({ buildId, stage: 'installable-public-offline-fallback', offlineSessionRestore: false }));
console.log(`PWA export prepared: ${buildId}; private APIs remain network-only`);
