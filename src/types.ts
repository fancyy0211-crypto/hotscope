export type Source = '微博' | '抖音' | '知乎' | '小红书';

export type Industry = 
  | '互联网 / 科技'
  | '消费品 / 电商'
  | '金融 / 投资'
  | '教育 / 教培'
  | '医疗 / 健康'
  | '制造业 / 工业'
  | '房地产 / 城市'
  | '服务业'
  | '广告 / 传媒 / 内容'
  | '职场 / HR / 管理';

export type RecommendationLevel = '强推荐' | '可跟进' | '不建议';
export type ContentFormat = '图文' | '短视频';
export type ContentStyle = '干货型' | '情绪共鸣' | '争议观点' | '热点解读';
export type ContentDirection = '教程类' | '观点类' | '案例拆解' | '实操类';
export type ContentGoal = '引流' | '转化' | '品牌' | '涨粉';
export type StrategyKey = 'comparison' | 'analysis' | 'emotion' | 'toolkit';

export type DigestPreference = {
  selectedPlatforms: Source[];
  selectedIndustries: string[];
};

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
};

export interface ScoreBreakdown {
  hotness: {
    platform: number;
    growth: number;
    sustained: number;
  };
  opportunity: {
    fit: number;
    malleability: number;
    viral: number;
    competition: number;
  };
}

export interface TrendDataPoint {
  time: string;
  value: number;
}

export interface ActionAdvice {
  postTime: string;
  platforms: string[];
  format: ContentFormat;
  angle: string;
}

export interface HotTopic {
  id: string;
  title: string;
  source: Source;
  link?: string;
  popularity: number;
  industry?: Industry;
  tags: Industry[];
  summary: string;
  trend: 'up' | 'down' | 'stable';
  recommendation: RecommendationLevel;
  hotnessScore: number;
  opportunityScore: number;
  breakdown: ScoreBreakdown;
  trendData: TrendDataPoint[];
  actionAdvice: ActionAdvice;
  isNew?: boolean;
  isFavorite?: boolean;
  isProcessed?: boolean;
  isUsed?: boolean;
  suggestedDirections?: ContentDirection[];
}

export interface GeneratedTopic {
  id: string;
  title: string;
  explanation: string;
  structure: string[];
  platforms: string[];
  format?: ContentFormat;
  angleName?: string;
  platformAdvice?: string;
  contentSegments?: string[];
  paceAdvice?: string;
  cta?: string;
  copyTitle?: string;
  coverTitle?: string;
  tagsSuggestion?: string;
  commentGuide?: string;
  hook?: string;
  appliedStrategies?: StrategyKey[];
}

export interface GenerationPrefs {
  goal: ContentGoal;
  strategies: StrategyKey[];
}

export interface GeneratedRecord {
  id: string;
  topicId: string;
  title: string;
  goal: ContentGoal;
  strategies: StrategyKey[];
  createdAt: string;
  content: string;
}
