import {
  getAdvancedTopicMetadata,
  renderAdvancedTopicPage,
} from '../_advanced-topic-view';

export const metadata = getAdvancedTopicMetadata('async-operations');

export default function AsyncOperationsPage() {
  return renderAdvancedTopicPage('async-operations');
}
