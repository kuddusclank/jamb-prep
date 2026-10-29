import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const out = path.join(root, 'out');
const hasOut = await stat(out).then(s => s.isDirectory()).catch(() => false);
const assetDir = hasOut ? out : publicDir;

const template = await readFile(path.join(publicDir, 'sw.js'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(assetDir, 'site.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || manifest.scope !== '/' || manifest.id !== '/') throw new Error('Invalid PWA identity');
const required = ['offline.html', 'icon-192.png', 'icon-512.png', 'lecterniq-mark.svg'];
const hash = createHash('sha256').update(template);
for (const name of required) {
  if (!(await stat(path.join(assetDir, name))).isFile()) throw new Error(`Missing ${name}`);
  hash.update(await readFile(path.join(assetDir, name)));
}
try {
  hash.update(await readFile(path.join(assetDir, 'index.html')));
} catch {
  hash.update(Buffer.from('ssr-app-shell'));
}
const buildId = hash.digest('hex').slice(0, 20);
const pwaPayload = JSON.stringify({ buildId, stage: 'installable-public-offline-fallback', offlineSessionRestore: false }, null, 2);

await writeFile(path.join(publicDir, 'pwa-build.json'), pwaPayload);
if (hasOut) {
  await writeFile(path.join(out, 'sw.js'), template.replace('__PWA_BUILD_ID__', buildId));
  await writeFile(path.join(out, 'pwa-build.json'), pwaPayload);
}
console.log(`PWA export prepared: ${buildId}; private APIs remain network-only`);
