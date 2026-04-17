import { loadConfigs, saveConfigs, storeMode } from './_lib/store';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const configs = await loadConfigs();
      return res.status(200).json({ configs, mode: storeMode() });
    }

    if (req.method === 'POST') {
      const nextConfigs = Array.isArray(req.body?.configs) ? req.body.configs : null;
      if (!nextConfigs) {
        return res.status(400).json({ error: 'Invalid payload: configs required' });
      }
      await saveConfigs(nextConfigs);
      return res.status(200).json({ ok: true, count: nextConfigs.length, mode: storeMode() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[api/digest-configs] failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
