import {
  getAdvancedTopicMetadata,
  renderAdvancedTopicPage,
} from '../_advanced-topic-view';

export const metadata = getAdvancedTopicMetadata('observation');

export default function ObservationPage() {
  return renderAdvancedTopicPage('observation');
}
