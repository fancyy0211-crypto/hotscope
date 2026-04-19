import { ContentCategory, Source } from '../types';
import { classifyHotTopicCategory, scoreTopicCategories } from '../utils/classifyHotTopic';

type CategoryContext = {
  source?: Source;
  summary?: string;
  tags?: string[];
  debug?: boolean;
};

export const mapToContentCategory = (
  title: string,
  context: CategoryContext = {}
): ContentCategory => classifyHotTopicCategory(title, context);

export { scoreTopicCategories };
