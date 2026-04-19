import { HotTopic, OpportunityType } from '../types';

export const clampScore = (value: number) => Math.max(1, Math.min(100, Math.round(value)));

export const computeHotnessScore = (hotValue: number, maxHot: number) => {
  const safeHot = Math.max(1, hotValue);
  const safeMax = Math.max(1, maxHot);
  return clampScore((Math.log(safeHot + 1) / Math.log(safeMax + 1)) * 100);
};

export const computeGrowthScore = (rankPercentile: number, seed: number, hotnessScore: number) => {
  const momentum = 46 + rankPercentile * 38 - hotnessScore * 0.12;
  const jitter = ((seed % 11) - 5) * 2;
  return clampScore(momentum + jitter);
};

export const computeCompetitionScore = (rankPercentile: number, hotnessScore: number, seed: number) => {
  const base = 30 + (1 - rankPercentile) * 52 + hotnessScore * 0.12;
  const jitter = ((seed % 9) - 4) * 1.6;
  return clampScore(base + jitter);
};

export const computeOpportunityScore = (rankPercentile: number, growth: number, competition: number) => {
  const score =
    0.4 * rankPercentile * 100
    + 0.3 * growth
    + 0.3 * (100 - competition);
  return clampScore(score);
};

export const getOpportunityTypeByScores = ({
  hotnessScore,
  opportunityScore
}: {
  hotnessScore: number;
  opportunityScore: number;
}): OpportunityType => {
  if (hotnessScore >= 90 && opportunityScore < 35) return '高热红海';
  if (hotnessScore >= 85 && opportunityScore >= 80) return '强势窗口';
  if (hotnessScore < 40 && opportunityScore >= 75) return '潜力早期';
  if (hotnessScore >= 40 && opportunityScore >= 75) return '黄金机会';
  if (hotnessScore >= 65 && opportunityScore >= 50) return '上升窗口';
  return '观察区间';
};

const applyTopPercentile = (topics: HotTopic[], scoreKey: 'hotnessScore' | 'opportunityScore', percentileKey: 'hotPercentile' | 'opportunityPercentile') => {
  const sorted = [...topics].sort((a, b) => b[scoreKey] - a[scoreKey]);
  const total = Math.max(1, sorted.length);
  const rankById = new Map(sorted.map((topic, rank) => [topic.id, rank]));

  return topics.map((topic) => {
    const rank = rankById.get(topic.id) ?? total - 1;
    const topPercentile = Math.max(1, Math.min(100, Math.round(((total - rank) / total) * 100)));
    return {
      ...topic,
      [percentileKey]: topPercentile
    };
  });
};

export const applyTopicPercentiles = (topics: HotTopic[]): HotTopic[] => {
  const withHotPercentile = applyTopPercentile(topics, 'hotnessScore', 'hotPercentile');
  return applyTopPercentile(withHotPercentile, 'opportunityScore', 'opportunityPercentile');
};
