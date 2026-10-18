import { ApiError } from '../api/errors';

export const REVIEWED_PUSH_ENDPOINT_HOST_SUFFIXES = [
  'fcm.googleapis.com',
  'push.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
  'push.apple.com',
  'notify.windows.com',
] as const;

export const GENERIC_STUDY_REMINDER_TITLE = 'Time for a little progress';
export const GENERIC_STUDY_REMINDER_BODY =
  "Your study goal is waiting. Open JAMBPrep when you're ready.";
export const GENERIC_STUDY_REMINDER_URL = '/practice/';
export const GENERIC_STUDY_REMINDER_TAG = 'jambprep-study-reminder';
export const DEFAULT_REMINDER_TTL_SECONDS = 900; // 15 minutes

export interface ValidatedWebPushSubscription {
  endpoint: string;
  endpointOrigin: string;
  endpointHost: string;
  endpointHash: string;
  p256dh: string;
  p256dhBytes: Uint8Array;
  auth: string;
  authBytes: Uint8Array;
  deviceLabel: string;
  environment: 'browser' | 'standalone_pwa' | 'ios_home_screen_pwa' | 'android_pwa';
}

export interface VapidKeyConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
  version?: number;
}

export interface EncryptedWebPushRequest {
  endpoint: string;
  headers: Record<string, string>;
  body: Uint8Array<ArrayBuffer>;
}

function toBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const trimmed = String(input ?? '').trim();
  if (!trimmed || !/^[A-Za-z0-9+/_=-]+$/.test(trimmed)) {
    throw new Error('Invalid base64url string.');
  }
  const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', toBufferSource(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isIpLiteralOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes(':') || // IPv6 literal
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) // IPv4 literal
  ) {
    return true;
  }
  return false;
}

export function isAllowedPushEndpointHost(
  hostname: string,
  allowedSuffixes: readonly string[] = REVIEWED_PUSH_ENDPOINT_HOST_SUFFIXES
): boolean {
  const host = hostname.toLowerCase().trim();
  if (!host || isIpLiteralOrPrivateHost(host)) {
    return false;
  }
  return allowedSuffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

export async function validateWebPushSubscriptionInput(
  rawInput: unknown,
  options?: {
    allowedHostSuffixes?: readonly string[];
  }
): Promise<ValidatedWebPushSubscription> {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription payload must be a JSON object.',
    });
  }

  const record = rawInput as Record<string, unknown>;
  const rawEndpoint = typeof record.endpoint === 'string' ? record.endpoint.trim() : '';
  if (!rawEndpoint || rawEndpoint.length > 2048) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription endpoint is missing or exceeds maximum length.',
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawEndpoint);
  } catch {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription endpoint must be a valid HTTPS URL.',
    });
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription endpoint must use HTTPS.',
    });
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription endpoint must not include credentials.',
    });
  }

  if (parsedUrl.port && parsedUrl.port !== '443') {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription endpoint must not specify a non-standard port.',
    });
  }

  if (parsedUrl.hash) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription endpoint must not contain URL fragments.',
    });
  }

  if (!isAllowedPushEndpointHost(parsedUrl.hostname, options?.allowedHostSuffixes)) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription endpoint host is not on the reviewed Web Push provider allowlist.',
    });
  }

  const keysObj =
    record.keys && typeof record.keys === 'object'
      ? (record.keys as Record<string, unknown>)
      : record;

  const rawP256dh = typeof keysObj.p256dh === 'string' ? keysObj.p256dh.trim() : '';
  const rawAuth =
    typeof keysObj.auth === 'string'
      ? keysObj.auth.trim()
      : typeof keysObj.authSecret === 'string'
        ? keysObj.authSecret.trim()
        : '';

  if (!rawP256dh || !rawAuth) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription must include both p256dh and auth keys.',
    });
  }

  let p256dhBytes: Uint8Array;
  let authBytes: Uint8Array;
  try {
    p256dhBytes = base64UrlDecode(rawP256dh);
    authBytes = base64UrlDecode(rawAuth);
  } catch {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription keys must be valid base64url strings.',
    });
  }

  if (p256dhBytes.length !== 65 || p256dhBytes[0] !== 0x04) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription p256dh key must be a 65-byte uncompressed P-256 public key.',
    });
  }

  if (authBytes.length !== 16) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription auth secret must be 16 bytes.',
    });
  }

  try {
    await crypto.subtle.importKey(
      'raw',
      toBufferSource(p256dhBytes),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
  } catch {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Push subscription p256dh key is not a valid point on the P-256 curve.',
    });
  }

  const rawLabel = typeof record.deviceLabel === 'string' ? record.deviceLabel.trim() : '';
  const sanitizedLabel = (rawLabel || 'Study device')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .slice(0, 80)
    .trim() || 'Study device';

  const rawEnv = typeof record.environment === 'string' ? record.environment.trim() : 'browser';
  const allowedEnvs = new Set([
    'browser',
    'standalone_pwa',
    'ios_home_screen_pwa',
    'android_pwa',
  ]);
  const environment = (allowedEnvs.has(rawEnv) ? rawEnv : 'browser') as ValidatedWebPushSubscription['environment'];

  const canonicalEndpoint = parsedUrl.toString();
  const endpointHash = await sha256Hex(canonicalEndpoint);

  return {
    endpoint: canonicalEndpoint,
    endpointOrigin: parsedUrl.origin,
    endpointHost: parsedUrl.hostname.toLowerCase(),
    endpointHash,
    p256dh: base64UrlEncode(p256dhBytes),
    p256dhBytes,
    auth: base64UrlEncode(authBytes),
    authBytes,
    deviceLabel: sanitizedLabel,
    environment,
  };
}

export interface GenericStudyReminderPayload {
  type: 'study_reminder';
  version: 1;
  title: string;
  body: string;
  url: '/practice/' | '/dashboard/';
  tag: string;
  sentAt: string;
}

export function buildGenericStudyReminderPayload(
  now: Date = new Date(),
  url: '/practice/' | '/dashboard/' = GENERIC_STUDY_REMINDER_URL
): GenericStudyReminderPayload {
  const safeUrl = url === '/dashboard/' ? '/dashboard/' : '/practice/';
  return {
    type: 'study_reminder',
    version: 1,
    title: GENERIC_STUDY_REMINDER_TITLE,
    body: GENERIC_STUDY_REMINDER_BODY,
    url: safeUrl,
    tag: GENERIC_STUDY_REMINDER_TAG,
    sentAt: now.toISOString(),
  };
}

async function importVapidPrivateKey(
  publicKeyBase64Url: string,
  privateKeyBase64Url: string
): Promise<{ signingKey: CryptoKey; publicKeyBytes: Uint8Array<ArrayBuffer> }> {
  const publicKeyBytes = base64UrlDecode(publicKeyBase64Url);
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error('VAPID public key must be a 65-byte uncompressed P-256 point.');
  }
  const privateBytes = base64UrlDecode(privateKeyBase64Url);
  if (privateBytes.length !== 32) {
    throw new Error('VAPID private key must be a 32-byte raw P-256 scalar.');
  }

  const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
  const y = base64UrlEncode(publicKeyBytes.slice(33, 65));
  const d = base64UrlEncode(privateBytes);

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d,
    ext: true,
  };

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  return { signingKey, publicKeyBytes };
}

export async function createVapidAuthorizationHeader(params: {
  endpointOrigin: string;
  vapid: VapidKeyConfig;
  now?: Date;
  expirationSeconds?: number;
}): Promise<{ authorization: string; cryptoKeyHeader: string }> {
  const now = params.now ?? new Date();
  const expSeconds = Math.min(Math.max(params.expirationSeconds ?? 12 * 60 * 60, 300), 24 * 60 * 60);
  const exp = Math.floor(now.getTime() / 1000) + expSeconds;

  const { signingKey, publicKeyBytes } = await importVapidPrivateKey(
    params.vapid.publicKey,
    params.vapid.privateKey
  );

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: params.endpointOrigin,
    exp,
    sub: params.vapid.subject,
  };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    toBufferSource(new TextEncoder().encode(signingInput))
  );
  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));
  const jwt = `${signingInput}.${signature}`;
  const normalizedPublicKey = base64UrlEncode(publicKeyBytes);

  return {
    authorization: `vapid t=${jwt}, k=${normalizedPublicKey}`,
    cryptoKeyHeader: `p256ecdsa=${normalizedPublicKey}`,
  };
}

async function hkdfExtractAndExpand(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  byteLength: number
): Promise<Uint8Array<ArrayBuffer>> {
  const baseKey = await crypto.subtle.importKey('raw', toBufferSource(ikm), 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toBufferSource(salt),
      info: toBufferSource(info),
    },
    baseKey,
    byteLength * 8
  );
  return new Uint8Array(bits);
}

/**
 * RFC 8291 / RFC 8188 (aes128gcm) Web Push payload encryption using standard WebCrypto.
 */
export async function encryptWebPushAes128GcmPayload(params: {
  plaintext: string | Uint8Array;
  subscriberPublicKeyBytes: Uint8Array;
  subscriberAuthSecretBytes: Uint8Array;
  salt?: Uint8Array;
  localKeyPair?: CryptoKeyPair;
}): Promise<{
  ciphertextBody: Uint8Array<ArrayBuffer>;
  salt: Uint8Array<ArrayBuffer>;
  localPublicKeyBytes: Uint8Array<ArrayBuffer>;
}> {
  const plaintextBytes =
    typeof params.plaintext === 'string'
      ? new TextEncoder().encode(params.plaintext)
      : params.plaintext;

  if (plaintextBytes.length > 3072) {
    throw new Error('Web Push payload exceeds safe 3KB plaintext limit.');
  }

  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(params.subscriberPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const localKeyPair =
    params.localKeyPair ??
    ((await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    )) as CryptoKeyPair);

  const localPublicRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicRaw);

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  const ecdhSecret = new Uint8Array(sharedSecretBits);

  const salt = toBufferSource(params.salt ?? crypto.getRandomValues(new Uint8Array(16)));
  if (salt.length !== 16) {
    throw new Error('RFC 8291 encryption salt must be 16 bytes.');
  }

  // RFC 8291 Section 3.3: key_info = "WebPush: info" || 0x00 || ua_public || as_public
  const webPushInfoPrefix = new TextEncoder().encode('WebPush: info\0');
  const keyInfo = concatBytes(
    webPushInfoPrefix,
    params.subscriberPublicKeyBytes,
    localPublicKeyBytes
  );

  const ikm = await hkdfExtractAndExpand(
    ecdhSecret,
    params.subscriberAuthSecretBytes,
    keyInfo,
    32
  );

  // RFC 8188 Section 2.2 & 2.3: CEK and Nonce derivation
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const cekBytes = await hkdfExtractAndExpand(ikm, salt, cekInfo, 16);
  const nonceBytes = await hkdfExtractAndExpand(ikm, salt, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cekBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Final record delimiter 0x02 (RFC 8188 Section 2)
  const paddedPlaintext = concatBytes(plaintextBytes, new Uint8Array([0x02]));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBytes, tagLength: 128 },
    aesKey,
    paddedPlaintext
  );
  const encryptedRecord = new Uint8Array(encryptedBuffer);

  // RFC 8188 Section 2.1 header: salt (16) || rs (4, uint32 BE = 4096) || idlen (1 = 65) || keyid (65 = as_public)
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyBytes.length);
  header.set(salt, 0);
  const view = new DataView(header.buffer);
  view.setUint32(16, 4096, false);
  header[20] = localPublicKeyBytes.length;
  header.set(localPublicKeyBytes, 21);

  return {
    ciphertextBody: concatBytes(header, encryptedRecord),
    salt,
    localPublicKeyBytes,
  };
}

/**
 * RFC 8291 / RFC 8188 (aes128gcm) decryption helper used to verify standards interoperability in tests.
 */
export async function decryptWebPushAes128GcmPayload(params: {
  ciphertextBody: Uint8Array;
  subscriberKeyPair: CryptoKeyPair;
  subscriberPublicKeyBytes: Uint8Array;
  subscriberAuthSecretBytes: Uint8Array;
}): Promise<string> {
  const body = params.ciphertextBody;
  if (body.length < 21 + 65 + 17) {
    throw new Error('Encrypted aes128gcm body is too short.');
  }

  const salt = body.slice(0, 16);
  const idLen = body[20];
  if (idLen !== 65) {
    throw new Error(`Unexpected aes128gcm keyid length: ${idLen}`);
  }
  const senderPublicKeyBytes = body.slice(21, 21 + idLen);
  const encryptedRecord = body.slice(21 + idLen);

  const senderPublicKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(senderPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: senderPublicKey },
    params.subscriberKeyPair.privateKey,
    256
  );
  const ecdhSecret = new Uint8Array(sharedSecretBits);

  const webPushInfoPrefix = new TextEncoder().encode('WebPush: info\0');
  const keyInfo = concatBytes(
    webPushInfoPrefix,
    params.subscriberPublicKeyBytes,
    senderPublicKeyBytes
  );

  const ikm = await hkdfExtractAndExpand(
    ecdhSecret,
    params.subscriberAuthSecretBytes,
    keyInfo,
    32
  );

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const cekBytes = await hkdfExtractAndExpand(ikm, salt, cekInfo, 16);
  const nonceBytes = await hkdfExtractAndExpand(ikm, salt, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cekBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonceBytes, tagLength: 128 },
    aesKey,
    toBufferSource(encryptedRecord)
  );
  const decryptedBytes = new Uint8Array(decryptedBuffer);

  // Strip trailing 0x00 padding until 0x02 delimiter
  let delimiterIndex = decryptedBytes.length - 1;
  while (delimiterIndex >= 0 && decryptedBytes[delimiterIndex] === 0x00) {
    delimiterIndex -= 1;
  }
  if (delimiterIndex < 0 || decryptedBytes[delimiterIndex] !== 0x02) {
    throw new Error('Missing RFC 8188 0x02 record delimiter.');
  }

  return new TextDecoder().decode(decryptedBytes.slice(0, delimiterIndex));
}

export async function generateVapidKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;

  const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const jwkPrivate = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  if (!jwkPrivate.d) {
    throw new Error('Failed to export VAPID private scalar.');
  }

  return {
    publicKey: base64UrlEncode(rawPublic),
    privateKey: jwkPrivate.d,
  };
}

export async function buildSignedWebPushRequest(params: {
  subscription: {
    endpoint: string;
    p256dh: string;
    authSecret: string;
  };
  vapid: VapidKeyConfig;
  payload: GenericStudyReminderPayload;
  ttlSeconds?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  topic?: string;
  now?: Date;
}): Promise<EncryptedWebPushRequest> {
  const parsedEndpoint = new URL(params.subscription.endpoint);
  if (parsedEndpoint.protocol !== 'https:' || !isAllowedPushEndpointHost(parsedEndpoint.hostname)) {
    throw new Error('Refusing to build Web Push request for non-allowlisted endpoint.');
  }

  const p256dhBytes = base64UrlDecode(params.subscription.p256dh);
  const authBytes = base64UrlDecode(params.subscription.authSecret);
  const plaintextJson = JSON.stringify(params.payload);

  const [{ authorization }, { ciphertextBody }] = await Promise.all([
    createVapidAuthorizationHeader({
      endpointOrigin: parsedEndpoint.origin,
      vapid: params.vapid,
      now: params.now,
    }),
    encryptWebPushAes128GcmPayload({
      plaintext: plaintextJson,
      subscriberPublicKeyBytes: p256dhBytes,
      subscriberAuthSecretBytes: authBytes,
    }),
  ]);

  const ttl = Math.min(
    Math.max(Math.trunc(params.ttlSeconds ?? DEFAULT_REMINDER_TTL_SECONDS), 60),
    3600
  );

  const headers: Record<string, string> = {
    Authorization: authorization,
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(ciphertextBody.byteLength),
    TTL: String(ttl),
    Urgency: params.urgency ?? 'normal',
  };

  if (params.topic && /^[A-Za-z0-9_-]{1,32}$/.test(params.topic)) {
    headers.Topic = params.topic;
  }

  return {
    endpoint: parsedEndpoint.toString(),
    headers,
    body: ciphertextBody,
  };
}
