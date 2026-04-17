import { DigestScheduleConfig } from './types';

const STORE_KEY = 'hotscope:digest:configs';

let memoryConfigs: DigestScheduleConfig[] = [];

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;

const hasKv = Boolean(kvUrl && kvToken);

async function kvGet(key: string): Promise<string | null> {
  if (!hasKv) return null;
  const resp = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, {
    headers: {
      Authorization: `Bearer ${kvToken}`
    }
  });
  if (!resp.ok) throw new Error(`KV get failed: ${resp.status}`);
  const payload = await resp.json();
  return payload?.result ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!hasKv) return;
  const resp = await fetch(`${kvUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    headers: {
      Authorization: `Bearer ${kvToken}`
    }
  });
  if (!resp.ok) throw new Error(`KV set failed: ${resp.status}`);
}

export async function loadConfigs(): Promise<DigestScheduleConfig[]> {
  if (!hasKv) return memoryConfigs;
  const raw = await kvGet(STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveConfigs(configs: DigestScheduleConfig[]): Promise<void> {
  if (!hasKv) {
    memoryConfigs = configs;
    return;
  }
  await kvSet(STORE_KEY, JSON.stringify(configs));
}

export function storeMode(): 'kv' | 'memory' {
  return hasKv ? 'kv' : 'memory';
}

