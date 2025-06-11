
interface Profile {
  username: string;
  displayName: string;
  statusMessage: string;
  code: string;
  createdAt: string;
}

export interface LoginData {
  username: string;
  displayName: string;
  status: string;
  code: string;
}

function le32(n: number) {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, n, true);
  return buf;
}

function encodeSection(obj: any) {
  const json = new TextEncoder().encode(JSON.stringify(obj));
  return new Uint8Array([...le32(json.length), ...json]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

export async function createRayFile(username: string, password: string, displayName: string, status: string, code: string) {
  const profile: Profile = { username, displayName, statusMessage: status, code, createdAt: new Date().toISOString() };
  const profileData = encodeSection(profile);
  const contactsData = encodeSection([]);
  const chatsData = encodeSection([]);
  const attachmentsData = new Uint8Array(0);
  const settingsData = encodeSection({});

  const payload = concat(profileData, contactsData, chatsData, attachmentsData, settingsData);

  const headerObj = {
    version: 1,
    crypto: {
      kdf: 'pbkdf2',
      kdfParams: { iter: 100000, hash: 'SHA-256' },
      cipher: 'AES-256-GCM',
      saltLen: 16,
      nonceLen: 12,
      tagLen: 16
    },
    sections: [
      { name: 'profile', length: profileData.length },
      { name: 'contacts', length: contactsData.length },
      { name: 'chats', length: chatsData.length },
      { name: 'attachments', length: attachmentsData.length },
      { name: 'settings', length: settingsData.length }
    ]
  };
  const header = new TextEncoder().encode(JSON.stringify(headerObj));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, payload));
  const tag = encrypted.slice(encrypted.length - 16);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);

  const out = concat(
    new TextEncoder().encode('RAY1'),
    le32(header.length),
    header,
    salt,
    nonce,
    ciphertext,
    tag
  );
  return new Blob([out], { type: 'application/octet-stream' });
}

export async function readRayFile(buffer: ArrayBuffer, password: string): Promise<LoginData | null> {
  const bytes = new Uint8Array(buffer);
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  if (magic !== 'RAY1') return null;
  const headerLen = new DataView(bytes.buffer, 4, 4).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.slice(8, 8 + headerLen)));
  const offset = 8 + headerLen;
  const salt = bytes.slice(offset, offset + 16);
  const nonce = bytes.slice(offset + 16, offset + 28);
  const cipher = bytes.slice(offset + 28, bytes.length - 16);
  const tag = bytes.slice(bytes.length - 16);

  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, concat(cipher, tag));
  const plain = new Uint8Array(decrypted);

  const sections = header.sections as { name: string; length: number }[];
  let idx = 0;
  const results: Record<string, Uint8Array> = {};
  for (const s of sections) {
    results[s.name] = plain.slice(idx, idx + s.length);
    idx += s.length;
  }
  const pLen = new DataView(results['profile'].buffer, results['profile'].byteOffset, 4).getUint32(0, true);
  const profile = JSON.parse(new TextDecoder().decode(results['profile'].slice(4, 4 + pLen)));
  return { username: profile.username, displayName: profile.displayName, status: profile.statusMessage, code: profile.code };
}
