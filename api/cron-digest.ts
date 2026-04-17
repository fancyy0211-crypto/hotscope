import { buildDigestParams } from './_lib/digest';
import { loadConfigs, saveConfigs } from './_lib/store';
import { fetchAllTopicsLite } from './_lib/topics';
import { DigestScheduleConfig } from './_lib/types';

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_zeup1ns';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_9vjyydm';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'dz2gqhh3h1KEfpokf';

const SH_TZ = 'Asia/Shanghai';

const currentSlot = () => {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: SH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hour: get('hour'),
    minute: get('minute')
  };
};

async function sendEmail(params: Record<string, string>, toEmail: string) {
  const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        email: toEmail,
        ...params
      }
    })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`EmailJS send failed: ${resp.status} ${text}`);
  }
}

function isDue(config: DigestScheduleConfig, nowHour: string, nowMinute: string, slotKey: string) {
  if (!config.enabled) return false;
  if (config.hour !== nowHour || config.minute !== nowMinute) return false;
  if (config.lastSentAt === slotKey) return false;
  return true;
}

export default async function handler(req: any, res: any) {
  try {
    const headerCron = req.headers['x-vercel-cron'];
    const auth = req.headers.authorization;
    const allowByHeader = typeof headerCron === 'string' && headerCron.length > 0;
    const allowBySecret =
      process.env.CRON_SECRET &&
      auth === `Bearer ${process.env.CRON_SECRET}`;

    if (!allowByHeader && !allowBySecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { dateKey, hour, minute } = currentSlot();
    const slotKey = `${dateKey}-${hour}:${minute}`;

    const configs = await loadConfigs();
    if (configs.length === 0) {
      return res.status(200).json({ ok: true, message: 'No configs' });
    }

    const dueConfigs = configs.filter((cfg) => isDue(cfg, hour, minute, slotKey));
    if (dueConfigs.length === 0) {
      return res.status(200).json({ ok: true, message: 'No due configs', slotKey });
    }

    const allTopics = await fetchAllTopicsLite();

    let sentConfigCount = 0;
    let sentEmailCount = 0;
    const failures: Array<{ configId: string; email: string; error: string }> = [];

    for (const config of dueConfigs) {
      const filteredTopics = allTopics.filter(
        (topic) =>
          config.selectedPlatforms.includes(topic.source) &&
          config.selectedIndustries.includes(topic.industry)
      );

      if (filteredTopics.length === 0) {
        continue;
      }

      const params = buildDigestParams(
        filteredTopics,
        config.selectedPlatforms,
        config.selectedIndustries
      );

      const emails = Array.from(new Set(config.emails));
      let thisConfigSent = 0;
      for (const email of emails) {
        try {
          await sendEmail(params, email);
          thisConfigSent += 1;
          sentEmailCount += 1;
        } catch (error) {
          failures.push({
            configId: config.id,
            email,
            error: error instanceof Error ? error.message : 'unknown'
          });
        }
      }

      if (thisConfigSent > 0) {
        sentConfigCount += 1;
      }
    }

    const nextConfigs = configs.map((cfg) =>
      dueConfigs.some((due) => due.id === cfg.id)
        ? { ...cfg, lastSentAt: slotKey, updatedAt: new Date().toISOString() }
        : cfg
    );
    await saveConfigs(nextConfigs);

    return res.status(200).json({
      ok: true,
      slotKey,
      dueConfigs: dueConfigs.length,
      sentConfigCount,
      sentEmailCount,
      failures
    });
  } catch (error) {
    console.error('[api/cron-digest] failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
