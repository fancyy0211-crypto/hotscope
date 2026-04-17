export type Source = '微博' | '抖音' | '知乎' | '小红书';

export type DigestScheduleConfig = {
  id: string;
  name: string;
  emails: string[];
  hour: string;
  minute: string;
  selectedPlatforms: Source[];
  selectedIndustries: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastSentAt?: string;
};

export type TopicLite = {
  title: string;
  source: Source;
  link?: string;
  industry: string;
  trend: 'up' | 'down' | 'stable';
  hotnessScore: number;
  opportunityScore: number;
};

