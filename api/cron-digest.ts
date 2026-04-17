import { buildDigestParams } from './_lib/digest';
import { fetchAllTopicsLite } from './_lib/topics';
import { Source } from './_lib/types';

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_zeup1ns';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_9vjyydm';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'dz2gqhh3h1KEfpokf';

const ALL_PLATFORMS: Source[] = ['微博', '抖音', '知乎', '小红书'];

const parseList = (value: string | undefined): string[] => {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .replace(/，/g, ',')
        .replace(/\n/g, ',')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

const parsePlatforms = (value: string | undefined): Source[] => {
  const parsed = parseList(value).filter((item): item is Source => ALL_PLATFORMS.includes(item as Source));
  return parsed.length > 0 ? parsed : [...ALL_PLATFORMS];
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

export default async function handler(req: any, res: any) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'CRON_SECRET is not configured' });
    }
    const auth = req.headers.authorization;
    const querySecret = req.query?.secret;
    const allowed = auth === `Bearer ${secret}` || querySecret === secret;
    if (!allowed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const emails = parseList(process.env.DAILY_DIGEST_EMAILS);
    if (emails.length === 0) {
      return res.status(200).json({ ok: true, message: 'Skip: DAILY_DIGEST_EMAILS is empty' });
    }

    const selectedPlatforms = parsePlatforms(process.env.DAILY_DIGEST_PLATFORMS);
    const selectedIndustries = parseList(process.env.DAILY_DIGEST_INDUSTRIES);

    const allTopics = await fetchAllTopicsLite();
    const filteredTopics = allTopics.filter((topic) => {
      const matchPlatform = selectedPlatforms.includes(topic.source);
      const matchIndustry = selectedIndustries.length === 0 || selectedIndustries.includes(topic.industry);
      return matchPlatform && matchIndustry;
    });

    if (filteredTopics.length === 0) {
      return res.status(200).json({
        ok: true,
        message: 'Skip: no topics matched env filters',
        selectedPlatforms,
        selectedIndustries
      });
    }

    const digestParams = buildDigestParams(filteredTopics, selectedPlatforms, selectedIndustries);

    let successCount = 0;
    const failures: Array<{ email: string; error: string }> = [];
    for (const email of emails) {
      try {
        await sendEmail(digestParams, email);
        successCount += 1;
      } catch (error) {
        failures.push({ email, error: error instanceof Error ? error.message : 'unknown' });
      }
    }

    return res.status(200).json({
      ok: true,
      triggered: true,
      totalEmails: emails.length,
      successCount,
      failCount: failures.length,
      failures
    });
  } catch (error) {
    console.error('[api/cron-digest] failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

