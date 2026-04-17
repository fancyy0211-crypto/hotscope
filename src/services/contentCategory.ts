import { ContentCategory } from '../types';

export const mapToContentCategory = (title: string): ContentCategory => {
  if (/明星|综艺|电影|演唱会|娱乐|艺人|偶像/.test(title)) return '文娱';
  if (/警方|通报|事故|事件|公共|民生|舆论|社会/.test(title)) return '社会';
  if (/AI|芯片|手机|互联网|科技|机器人|数码/i.test(title)) return '科技';
  if (/比赛|夺冠|联赛|球员|球队|奥运|体育/.test(title)) return '体育';
  if (/动漫|二次元|动画|漫画|cos|ACG/.test(title)) return 'ACG';
  if (/美食|穿搭|家居|出行|日常|生活|情感|健康生活/.test(title)) return '生活';
  if (/股市|黄金|经济|基金|投资|金融|资本/.test(title)) return '财经';
  if (/高考|考研|学校|教师|教育|教培|培训/.test(title)) return '教育';
  if (/车企|新车|驾驶|智驾|汽车/.test(title)) return '汽车';
  if (/手游|端游|版本更新|电竞|游戏/.test(title)) return '游戏';
  return '更多';
};

