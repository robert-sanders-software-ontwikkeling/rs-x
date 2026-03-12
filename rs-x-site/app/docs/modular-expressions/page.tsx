import {
  getAdvancedTopicMetadata,
  renderAdvancedTopicPage,
} from '../_advanced-topic-view';

export const metadata = getAdvancedTopicMetadata('modular-expressions');

export default function ModularExpressionsPage() {
  return renderAdvancedTopicPage('modular-expressions');
}
