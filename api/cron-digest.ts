// force fresh deployment 2026-04-18

import { fetchAllTopicsLite } from './_lib/topics';
import { Source, TopicLite } from './_lib/types';

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

const getTopicCompositeScore = (topic: TopicLite) =>
  topic.hotnessScore * 0.5 + topic.opportunityScore * 0.5;

const getEmailReason = (topic: TopicLite): string => {
  if (topic.hotnessScore > 80) return '热度高，处于爆发阶段';
  if (topic.trend === 'up') return '趋势上升，建议尽早介入';
  return '具备稳定讨论基础，适合作为简报观察对象';
};

const buildDigestConclusion = (
  topics: TopicLite[],
  selectedPlatforms: Source[]
): string => {
  if (topics.length === 0) {
    return '今日暂无满足筛选条件的热点，建议适当放宽平台筛选后再观察。';
  }
  const top1 = [...topics].sort((a, b) => getTopicCompositeScore(b) - getTopicCompositeScore(a))[0];
  const trendText = top1.trend === 'up' ? '仍处于上升窗口' : top1.trend === 'down' ? '热度回落，建议谨慎跟进' : '处于稳定讨论期';
  return `今日建议优先跟进「${top1.title}」，该话题在你关注的平台（${selectedPlatforms.join(' / ')}）中机会值最高，${trendText}。`;
};

const buildDigestParams = (
  topics: TopicLite[],
  selectedPlatforms: Source[]
): Record<string, string> => {
  const topTopics = [...topics].sort((a, b) => getTopicCompositeScore(b) - getTopicCompositeScore(a)).slice(0, 3);
  const payload: Record<string, string> = {
    platforms: selectedPlatforms.join(' / '),
    conclusion: buildDigestConclusion(topTopics, selectedPlatforms)
  };

  for (let i = 0; i < 3; i += 1) {
    const topic = topTopics[i];
    const idx = i + 1;
    payload[`title${idx}`] = topic?.title || '';
    payload[`score${idx}`] = topic ? String(Math.round(getTopicCompositeScore(topic))) : '';
    payload[`platform${idx}`] = topic?.source || '';
    payload[`link${idx}`] = topic?.link || '';
    payload[`reason${idx}`] = topic ? getEmailReason(topic) : '';
  }
  return payload;
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
    const allTopics = await fetchAllTopicsLite();
    const filteredTopics = allTopics.filter((topic) => {
      return selectedPlatforms.includes(topic.source);
    });

    if (filteredTopics.length === 0) {
      return res.status(200).json({
        ok: true,
        message: 'Skip: no topics matched env filters',
        selectedPlatforms
      });
    }

    const digestParams = buildDigestParams(filteredTopics, selectedPlatforms);

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
