import { buildDigestParams } from '../api/_lib/digest.ts';
import { fetchAllTopicsLite } from '../api/_lib/topics.ts';
import type { Source } from '../api/_lib/types.ts';

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '';

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
  const parsed = parseList(value).filter((item): item is Source =>
    ALL_PLATFORMS.includes(item as Source)
  );
  return parsed.length > 0 ? parsed : [...ALL_PLATFORMS];
};

const validateRequiredEnv = () => {
  const missing: string[] = [];
  if (!EMAILJS_SERVICE_ID) missing.push('EMAILJS_SERVICE_ID');
  if (!EMAILJS_TEMPLATE_ID) missing.push('EMAILJS_TEMPLATE_ID');
  if (!EMAILJS_PUBLIC_KEY) missing.push('EMAILJS_PUBLIC_KEY');
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
};

async function sendEmail(params: Record<string, string>, toEmail: string) {
  const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function main() {
  validateRequiredEnv();

  const emails = parseList(process.env.DAILY_DIGEST_EMAILS);
  if (emails.length === 0) {
    console.log('[daily-digest] Skip: DAILY_DIGEST_EMAILS is empty');
    return;
  }

  const selectedPlatforms = parsePlatforms(process.env.DAILY_DIGEST_PLATFORMS);
  const selectedIndustries = parseList(process.env.DAILY_DIGEST_INDUSTRIES);

  console.log('[daily-digest] config:', {
    emailCount: emails.length,
    selectedPlatforms,
    selectedIndustries
  });

  const allTopics = await fetchAllTopicsLite();
  console.log('[daily-digest] fetched topics:', allTopics.length);

  const filteredTopics = allTopics.filter((topic) => {
    const matchPlatform = selectedPlatforms.includes(topic.source);
    const matchIndustry =
      selectedIndustries.length === 0 ||
      selectedIndustries.includes(topic.industry);
    return matchPlatform && matchIndustry;
  });

  if (filteredTopics.length === 0) {
    console.log('[daily-digest] Skip: no topics matched filters');
    return;
  }

  const digestParams = buildDigestParams(
    filteredTopics,
    selectedPlatforms,
    selectedIndustries
  );

  let successCount = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const email of emails) {
    try {
      await sendEmail(digestParams, email);
      successCount += 1;
      console.log(`[daily-digest] sent: ${email}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      failures.push({ email, error: message });
      console.error(`[daily-digest] failed: ${email} -> ${message}`);
    }
  }

  console.log('[daily-digest] done:', {
    totalEmails: emails.length,
    successCount,
    failCount: failures.length
  });

  if (failures.length > 0) {
    throw new Error(
      `Partial failure: ${failures.length}/${emails.length} emails failed`
    );
  }
}

main().catch((error) => {
  console.error('[daily-digest] fatal:', error);
  process.exit(1);
});

