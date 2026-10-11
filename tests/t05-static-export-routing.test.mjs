import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "out");

function loadTsModule(relativePath, mocks = {}) {
  const filename = path.join(ROOT, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const customRequire = (id) => {
    if (id in mocks) return mocks[id];
    throw new Error(`Unexpected import ${id} in ${relativePath}`);
  };
  const fn = vm.runInThisContext(
    `(function(exports, require, module, __filename, __dirname) {\n${outputText}\n})`,
    { filename }
  );
  fn(module.exports, customRequire, module, filename, path.dirname(filename));
  return module.exports;
}

const deepLinks = loadTsModule("src/lib/routing/deep-links.ts");

function parseHeadersFile(content) {
  const sections = [];
  let current = null;
  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    if (!rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
      current = { pattern: rawLine.trim(), headers: {} };
      sections.push(current);
    } else if (current) {
      const idx = rawLine.indexOf(":");
      if (idx > 0) {
        const key = rawLine.slice(0, idx).trim().toLowerCase();
        const val = rawLine.slice(idx + 1).trim();
        current.headers[key] = val;
      }
    }
  }
  return sections;
}

function matchHeaderPattern(pattern, pathname) {
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return pathname === pattern;
}

function createPagesStaticServer(outDir) {
  const redirectsContent = fs.readFileSync(path.join(outDir, "_redirects"), "utf8");
  const redirectRules = deepLinks.parseCloudflareRedirectsFile(redirectsContent);
  const headersContent = fs.readFileSync(path.join(outDir, "_headers"), "utf8");
  const headerSections = parseHeadersFile(headersContent);

  const applyCustomHeaders = (pathname, res) => {
    for (const section of headerSections) {
      if (matchHeaderPattern(section.pattern, pathname)) {
        for (const [k, v] of Object.entries(section.headers)) {
          res.setHeader(k, v);
        }
      }
    }
  };

  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const pathname = url.pathname;
    const search = url.search;

    // 1. Evaluate explicit _redirects rules first for legacy paths (/checkout, /mock/:attemptId, /mock/result/:attemptId)
    // Note: static index files like /mock/index.html only match exact /mock or /mock/
    const isExactMockLobby = pathname === "/mock" || pathname === "/mock/";
    if (!isExactMockLobby) {
      const matchedRedirect = deepLinks.evaluateCloudflareRedirects(
        redirectRules,
        pathname,
        search
      );
      if (matchedRedirect) {
        res.statusCode = matchedRedirect.status;
        res.setHeader("Location", matchedRedirect.location);
        res.end();
        return;
      }
    }

    // 2. Resolve static file in out/ (Cloudflare Pages trailingSlash: true semantics)
    const relativeClean = pathname.replace(/^\/+/, "");
    const candidates = [];
    if (relativeClean === "") {
      candidates.push(path.join(outDir, "index.html"));
    } else {
      candidates.push(path.join(outDir, relativeClean, "index.html"));
      candidates.push(path.join(outDir, relativeClean));
      if (!relativeClean.endsWith(".html")) {
        candidates.push(path.join(outDir, `${relativeClean}.html`));
      }
    }

    for (const candidate of candidates) {
      if (
        candidate.startsWith(outDir) &&
        fs.existsSync(candidate) &&
        fs.statSync(candidate).isFile()
      ) {
        applyCustomHeaders(pathname, res);
        res.statusCode = 200;
        res.setHeader(
          "Content-Type",
          candidate.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream"
        );
        res.end(fs.readFileSync(candidate));
        return;
      }
    }

    // 3. Fallback to out/404.html with HTTP 404
    const notFoundPath = path.join(outDir, "404.html");
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(fs.existsSync(notFoundPath) ? fs.readFileSync(notFoundPath) : "Not Found");
  });
}

test("T05.1: static build artifact (out/) contains all canonical route shells, 404 fallback, _redirects, and _headers without private ID enumeration", () => {
  assert.equal(fs.existsSync(OUT_DIR), true, "out/ directory must exist from real next build");

  const expectedHtmlFiles = [
    "index.html",
    "404.html",
    "404/index.html",
    "login/index.html",
    "register/index.html",
    "onboarding/index.html",
    "dashboard/index.html",
    "practice/index.html",
    "mock/index.html",
    "exam/index.html",
    "result/index.html",
    "analytics/index.html",
    "referrals/index.html",
    "pricing/index.html",
    "checkout/index.html",
    "checkout/verify/index.html",
    "profile/index.html",
  ];

  for (const rel of expectedHtmlFiles) {
    const fullPath = path.join(OUT_DIR, rel);
    assert.equal(fs.existsSync(fullPath), true, `Missing static export HTML file: out/${rel}`);
    const stat = fs.statSync(fullPath);
    assert.equal(stat.size > 200, true, `Static HTML file out/${rel} is unexpectedly empty`);
  }

  assert.equal(fs.existsSync(path.join(OUT_DIR, "_redirects")), true, "Missing out/_redirects");
  assert.equal(fs.existsSync(path.join(OUT_DIR, "_headers")), true, "Missing out/_headers");

  // Verify no private attempt directories were enumerated under out/mock, out/exam, or out/result
  for (const dirName of ["mock", "exam", "result"]) {
    const entries = fs.readdirSync(path.join(OUT_DIR, dirName), { withFileTypes: true });
    const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    assert.deepEqual(
      subdirs,
      [],
      `out/${dirName} must not contain enumerated child route directories, found: ${subdirs.join(", ")}`
    );
  }
});

test("T05.2: deep-link UUID validation and legacy path resolution enforce strict UUIDs and prevent redirect loops", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";
  assert.equal(deepLinks.isValidAttemptId(validUuid), true);
  assert.equal(deepLinks.isValidAttemptId("not-a-uuid"), false);
  assert.equal(deepLinks.isValidAttemptId(""), false);
  assert.equal(deepLinks.isValidAttemptId(null), false);
  assert.equal(deepLinks.isValidAttemptId("11111111-1111-4111-8111-111111111111/../../admin"), false);

  assert.deepEqual(deepLinks.parseAttemptIdFromSearch(`?attemptId=${validUuid}`), {
    valid: true,
    attemptId: validUuid,
  });
  assert.deepEqual(deepLinks.parseAttemptIdFromSearch(""), {
    valid: false,
    reason: "missing",
    raw: null,
  });
  assert.deepEqual(deepLinks.parseAttemptIdFromSearch("?attemptId=not-a-uuid"), {
    valid: false,
    reason: "invalid_uuid",
    raw: "not-a-uuid",
  });

  // Legacy path resolution
  assert.deepEqual(deepLinks.resolveLegacyDeepLinkRedirect(`/mock/${validUuid}`), {
    target: `/exam?attemptId=${validUuid}`,
    status: 302,
    reason: "legacy_mock_attempt",
  });
  assert.deepEqual(deepLinks.resolveLegacyDeepLinkRedirect(`/mock/${validUuid}/`), {
    target: `/exam?attemptId=${validUuid}`,
    status: 302,
    reason: "legacy_mock_attempt",
  });
  assert.deepEqual(deepLinks.resolveLegacyDeepLinkRedirect(`/mock/result/${validUuid}`), {
    target: `/result?attemptId=${validUuid}`,
    status: 302,
    reason: "legacy_mock_result",
  });
  assert.deepEqual(deepLinks.resolveLegacyDeepLinkRedirect("/mock/result"), {
    target: "/mock",
    status: 302,
    reason: "legacy_mock_result_root",
  });
  assert.deepEqual(deepLinks.resolveLegacyDeepLinkRedirect("/checkout"), {
    target: "/pricing",
    status: 301,
    reason: "legacy_checkout",
  });

  // Non-UUID and multi-segment paths must return null so 404 page renders without looping
  assert.equal(deepLinks.resolveLegacyDeepLinkRedirect("/mock/not-a-uuid"), null);
  assert.equal(deepLinks.resolveLegacyDeepLinkRedirect("/mock/result/not-a-uuid"), null);
  assert.equal(deepLinks.resolveLegacyDeepLinkRedirect("/mock/invalid/nested/path"), null);
  assert.equal(deepLinks.resolveLegacyDeepLinkRedirect("/unknown/path"), null);
});

test("T05.3: local HTTP static asset server verifies direct navigation, reload, trailing slashes, _redirects, and 404 fallback", async () => {
  const server = createPagesStaticServer(OUT_DIR);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const validUuid = "11111111-1111-4111-8111-111111111111";

    // 1. Direct navigation + reload on all canonical routes (with and without trailing slash / query string)
    const direct200Routes = [
      { path: "/", expectPrivateCache: false },
      { path: "/login", expectPrivateCache: false },
      { path: "/login/", expectPrivateCache: false },
      { path: "/register?ref=CODE", expectPrivateCache: false },
      { path: "/register/?ref=CODE", expectPrivateCache: false },
      { path: "/onboarding", expectPrivateCache: true },
      { path: "/onboarding/", expectPrivateCache: true },
      { path: "/dashboard", expectPrivateCache: true },
      { path: "/dashboard/", expectPrivateCache: true },
      { path: "/practice?subject=ENG&topic=comprehension", expectPrivateCache: true },
      { path: "/mock", expectPrivateCache: true },
      { path: "/mock/", expectPrivateCache: true },
      { path: `/exam?attemptId=${validUuid}`, expectPrivateCache: true },
      { path: `/exam/?attemptId=${validUuid}`, expectPrivateCache: true },
      { path: `/result?attemptId=${validUuid}`, expectPrivateCache: true },
      { path: `/result/?attemptId=${validUuid}`, expectPrivateCache: true },
      { path: "/analytics", expectPrivateCache: true },
      { path: "/referrals", expectPrivateCache: true },
      { path: "/pricing", expectPrivateCache: false },
      { path: "/checkout/verify?reference=REF123", expectPrivateCache: true },
      { path: "/profile", expectPrivateCache: true },
    ];

    for (const item of direct200Routes) {
      // Initial request + simulated browser reload (second request)
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await fetch(`${baseUrl}${item.path}`, { redirect: "manual" });
        assert.equal(
          res.status,
          200,
          `Expected 200 on ${item.path} (attempt ${attempt}), got ${res.status}`
        );
        const html = await res.text();
        assert.equal(html.includes("<!DOCTYPE html>"), true, `Expected HTML document for ${item.path}`);
        if (item.expectPrivateCache) {
          assert.equal(
            res.headers.get("cache-control"),
            "private, no-store, no-cache, must-revalidate",
            `Expected private no-store cache header on ${item.path}`
          );
        }
      }
    }

    // 2. Legacy route redirects (/checkout, /mock/:attemptId, /mock/result/:attemptId)
    const redirectCases = [
      {
        from: "/checkout",
        expectedStatus: 301,
        expectedLocation: "/pricing",
      },
      {
        from: "/checkout/",
        expectedStatus: 301,
        expectedLocation: "/pricing",
      },
      {
        from: "/mock/result",
        expectedStatus: 302,
        expectedLocation: "/mock",
      },
    ];

    for (const tc of redirectCases) {
      const manualRes = await fetch(`${baseUrl}${tc.from}`, { redirect: "manual" });
      assert.equal(manualRes.status, tc.expectedStatus, `Redirect status mismatch for ${tc.from}`);
      assert.equal(
        manualRes.headers.get("location"),
        tc.expectedLocation,
        `Redirect location mismatch for ${tc.from}`
      );

      // Follow redirect to confirm zero redirect loops and 200 destination shell
      const followedRes = await fetch(`${baseUrl}${tc.from}`, { redirect: "follow" });
      assert.equal(followedRes.status, 200, `Following redirect from ${tc.from} must resolve to 200`);
    }

    for (const legacyPath of [`/mock/${validUuid}`, `/mock/${validUuid}/`, `/mock/result/${validUuid}`, `/mock/result/${validUuid}/`]) {
      const fallback = await fetch(`${baseUrl}${legacyPath}`, {redirect:'manual'});
      assert.equal(fallback.status,404);
      assert.equal(fallback.headers.get('location'),null);
      assert.ok((await fallback.text()).includes('<!DOCTYPE html>'));
      assert.ok(deepLinks.resolveLegacyDeepLinkRedirect(legacyPath));
    }

    // 3. Unknown and malformed multi-segment paths must return 404 without redirect loops
    for (const invalidPath of ["/unknown/path", "/mock/invalid/nested/path"]) {
      const res = await fetch(`${baseUrl}${invalidPath}`, { redirect: "manual" });
      assert.equal(res.status, 404, `Expected 404 for ${invalidPath}, got ${res.status}`);
      const html = await res.text();
      assert.equal(
        html.includes("404 · Page Not Found"),
        true,
        `Expected 404 fallback UI for ${invalidPath}`
      );
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("T05.4: every useSearchParams() usage is wrapped in <Suspense> and no page/client module imports server-only modules", () => {
  const searchParamsPages = [
    "src/app/login/login-form.tsx",
    "src/app/register/register-form.tsx",
    "src/app/practice/page.tsx",
    "src/app/mock/page.tsx",
    "src/app/exam/page.tsx",
    "src/app/result/page.tsx",
    "src/app/checkout/verify/page.tsx",
  ];

  for (const relPath of searchParamsPages) {
    const content = fs.readFileSync(path.join(ROOT, relPath), "utf8");
    assert.equal(
      content.includes("useSearchParams"),
      true,
      `Expected useSearchParams in ${relPath}`
    );
    assert.equal(
      content.includes("<Suspense"),
      true,
      `${relPath} uses useSearchParams() and must wrap it in <Suspense>`
    );
  }

  // Walk src/app (excluding src/app/actions and src/app/api) and src/components to verify zero server-only imports
  const forbiddenImports = [
    "@/app/actions",
    "@/db",
    "next/headers",
    "@/lib/supabase/server",
    "@/lib/supabase/admin",
    "@opennextjs/cloudflare",
  ];

  function collectTsFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          full === path.join(ROOT, "src/app/actions") ||
          full === path.join(ROOT, "src/app/api")
        ) {
          continue;
        }
        results.push(...collectTsFiles(full));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        results.push(full);
      }
    }
    return results;
  }

  const clientAndPageFiles = [
    ...collectTsFiles(path.join(ROOT, "src/app")),
    ...collectTsFiles(path.join(ROOT, "src/components")),
  ];

  for (const file of clientAndPageFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const forbidden of forbiddenImports) {
      assert.equal(
        source.includes(`"${forbidden}`) || source.includes(`'${forbidden}`),
        false,
        `File ${path.relative(ROOT, file)} must not import server-only module ${forbidden}`
      );
    }
  }
});

test("T05.5: static export bundle (out/) contains zero service-role/Paystack/DB secrets, zero answer keys, and zero server modules", () => {
  const forbiddenPatterns = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAYSTACK_SECRET_KEY",
    "DATABASE_URL",
    "POSTGRES_URL",
    "service_role",
    "question_explanations",
    "drizzle-orm/postgres-js",
    "@opennextjs/cloudflare",
  ];

  function collectOutFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectOutFiles(full));
      } else if (
        entry.name.endsWith(".html") ||
        entry.name.endsWith(".js") ||
        entry.name.endsWith(".txt") ||
        entry.name.endsWith(".json")
      ) {
        files.push(full);
      }
    }
    return files;
  }

  const outFiles = collectOutFiles(OUT_DIR);
  assert.equal(outFiles.length > 20, true, "Expected exported bundle files in out/");

  for (const file of outFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.equal(
        text.includes(pattern),
        false,
        `Exported file ${path.relative(ROOT, file)} leaked forbidden token: ${pattern}`
      );
    }
  }
});

test('review: malformed escapes and invalid UUID versions cannot crash or enter exam routes', () => {
  for (const path of ['/mock/%', '/mock/result/%zz', '/mock/%E0%A4%A']) {
    assert.equal(deepLinks.resolveLegacyDeepLinkRedirect(path), null);
  }
  assert.equal(deepLinks.isValidAttemptId('11111111-1111-0111-0111-111111111111'), false);
  assert.throws(() => deepLinks.buildCanonicalExamUrl('invalid'), /INVALID_ATTEMPT_ID/);
  assert.throws(() => deepLinks.buildCanonicalResultUrl('invalid'), /INVALID_ATTEMPT_ID/);
  const rules = deepLinks.parseCloudflareRedirectsFile(fs.readFileSync(path.join(ROOT, 'public/_redirects'), 'utf8'));
  assert.equal(deepLinks.evaluateCloudflareRedirects(rules, '/mock/%'), null);
});

test('review: absent API configuration cannot claim successful profile provisioning', async () => {
  const previousBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    const bridge = loadTsModule('src/lib/client-actions.ts', {
      '@/lib/auth/account-coordinator': { getAccountCoordinator: () => ({ loadResource: async () => { throw new Error('API_NOT_CONFIGURED: unavailable'); }, api: { request: async () => { throw new Error('API_NOT_CONFIGURED: unavailable'); } } }) },
      '@/lib/auth/storage-cleanup': { registerPrivateCacheClearer() {} },
      '@/lib/api/native-client': { createNativeApiClient() { throw new Error('Must not call API without configuration'); } },
      '@/lib/auth/session-manager': {
        getDefaultBrowserSessionManager: () => ({ initialize: async () => {}, getValidAccessToken: async () => 'local-token', getState: () => ({ user: { id: '11111111-1111-4111-8111-111111111111' } }) }),
        computeBootstrapIdempotencyKey: async () => 'test-bootstrap-key',
      },
    });
    const form = new FormData();
    form.set('displayName', 'Test Student');
    assert.equal((await bridge.provisionRegisteredUserAction(form)).success, false);
    await assert.rejects(bridge.getCheckoutPricingAction(), /unavailable/i);
    await assert.rejects(bridge.recordMockInterruption('attempt', 'episode', true), /unavailable/i);
  } finally {
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousBase;
  }
});

test('review: exported CSS contains compiled utilities and no unresolved Tailwind directives', () => {
  const cssDir = path.join(OUT_DIR, '_next/static');
  const files = [];
  const walk = (dir) => { for (const item of fs.readdirSync(dir, {withFileTypes:true})) { const file=path.join(dir,item.name); if(item.isDirectory()) walk(file); else files.push(file); } };
  walk(cssDir);
  const css = files.filter(file => file.endsWith('.css')).map(file => fs.readFileSync(file,'utf8')).join('\n');
  assert.match(css, /\.flex\s*\{/);
  assert.match(css, /\.min-h-screen\s*\{/);
  assert.doesNotMatch(css, /@theme\b|@tailwind\b|@utility\b/);
  // Protected markup is now withheld until session verification. Validate the browser
  // module's exported class mapping against CSS instead of expecting private HTML.
  const js = files.filter(file => file.endsWith('.js')).map(file => fs.readFileSync(file,'utf8')).join('\n');
  for (const name of ['workspace', 'sidebar']) {
    const mapped = js.match(new RegExp(`${name}:"([^" ]+)"`))?.[1];
    assert.ok(mapped, `Missing browser CSS module class mapping for ${name}`);
    assert.ok(css.includes(`.${mapped}`), `Missing compiled selector for ${mapped}`);
  }
});

test('review: static artifacts do not contain configured private credential values', () => {
  const secrets = [];
  for (const file of fs.readdirSync(ROOT).filter((file) => file.startsWith('.env') && fs.statSync(path.join(ROOT, file)).isFile())) {
    for (const line of fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n')) {
      const match = /^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line.trim());
      if (!match || match[1].startsWith('NEXT_PUBLIC_') || !/(SECRET|SERVICE_ROLE|DATABASE_URL|POSTGRES_URL)/.test(match[1])) continue;
      const value = match[2].replace(/^['"]|['"]$/g, '').trim();
      if (value.length >= 12 && !/placeholder|your_|example/i.test(value)) secrets.push(value);
    }
  }
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(html|js|json|txt|map)$/.test(entry.name)) files.push(file);
    }
  };
  walk(OUT_DIR);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(secrets.some((value) => text.includes(value)), false, `Private credential found in ${path.relative(ROOT, file)}`);
  }
});
