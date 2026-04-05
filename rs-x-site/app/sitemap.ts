import type { MetadataRoute } from 'next';

import { coreApiItems } from './docs/core-api/core-api.data';
import { stateManagerApiItems } from './docs/state-manager-api/state-manager-api.data';
import {
  stateManagerApiGroupEntries,
  stateManagerApiModuleEntries,
} from './docs/state-manager-api/state-manager-api.helpers';

const BASE_URL = 'https://rsxjs.com';

const OBSERVATION_KINDS = [
  'plain-object-property',
  'array',
  'map',
  'set',
  'date',
  'promise',
  'observable',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Top-level pages
    { url: `${BASE_URL}/`, priority: 1.0, changeFrequency: 'weekly' },
    {
      url: `${BASE_URL}/get-started`,
      priority: 0.9,
      changeFrequency: 'monthly',
    },
    { url: `${BASE_URL}/features`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/docs`, priority: 0.9, changeFrequency: 'weekly' },
    {
      url: `${BASE_URL}/playground`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    { url: `${BASE_URL}/roadmap`, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/about`, priority: 0.5, changeFrequency: 'monthly' },
    { url: `${BASE_URL}/sponsor`, priority: 0.4, changeFrequency: 'monthly' },

    // SEO landing pages
    {
      url: `${BASE_URL}/react`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/nextjs`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/vue`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/angular`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/rxjs`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/nodejs`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/typescript`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/javascript`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/reactivity`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/change-detection`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/spa-frameworks`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },

    // Core concepts
    {
      url: `${BASE_URL}/docs/core-concepts/first-expression`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/cli`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/compiler`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/rsx-config`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/async-operations`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/batching-transactions`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/caching-and-identity`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/collections`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/dates`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/dependency-injection`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/expression-types`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/functions`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/identifier-owner-resolver`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/member-expressions`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/modular-expressions`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/performance-demo`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/performance-report`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/readonly-properties`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-concepts/side-effects`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/frameworks/react`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/frameworks/angular`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/frameworks/vue`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/frameworks/rxjs`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },

    // Core API index + symbol pages
    {
      url: `${BASE_URL}/docs/core-api`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/deep-clone`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/dependency-injection-ts`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/equality-service`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/error-log`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/exceptions`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/function-call-index`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/function-call-result-cache`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/guid`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/index-value-accessor`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/keyed-instance-factory`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/object-store`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/proxy-registry`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/rs-x-core-injection-tokens-ts`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/rs-x-core-module-ts`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/sequence-id`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/types`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/value-metadata`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/core-api/module/wait-for-event`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    ...coreApiItems.map((item) => ({
      url: `${BASE_URL}/docs/core-api/${encodeURIComponent(item.symbol)}`,
      priority: 0.5 as const,
      changeFrequency: 'monthly' as const,
    })),

    // State manager API index + group + module + symbol pages
    {
      url: `${BASE_URL}/docs/state-manager-api`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },
    ...stateManagerApiGroupEntries.map((group) => ({
      url: `${BASE_URL}/docs/state-manager-api/group/${group.key}`,
      priority: 0.6 as const,
      changeFrequency: 'monthly' as const,
    })),
    ...stateManagerApiModuleEntries.map((entry) => ({
      url: `${BASE_URL}/docs/${entry.moduleName}`,
      priority: 0.5 as const,
      changeFrequency: 'monthly' as const,
    })),
    ...stateManagerApiItems.map((item) => ({
      url: `${BASE_URL}/docs/state-manager-api/${encodeURIComponent(item.symbol)}`,
      priority: 0.5 as const,
      changeFrequency: 'monthly' as const,
    })),

    // Observation
    {
      url: `${BASE_URL}/docs/observation`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    ...OBSERVATION_KINDS.map((kind) => ({
      url: `${BASE_URL}/docs/observation/${kind}`,
      priority: 0.6 as const,
      changeFrequency: 'monthly' as const,
    })),

    // Other docs pages
    {
      url: `${BASE_URL}/docs/abstract-expression`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/array-index-owner-resolver`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/async-operations`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/change-hook`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/collections`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/custom-data-types`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/default-identifier-owner-resolver`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/expression-change-commit-handler`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/expression-change-tracker-manager`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/expression-change-transaction-manager`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/expression-creation`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/expression-type`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/global-identifier-owner-resolver`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/iexpression`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/irsx-options`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/iidentifier-owner-resolver`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/index-watch-rule`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/iproxy-registry`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/keyed-instance-factory`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/map-key-owner-resolver`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/modular-expressions`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/property-owner-resolver`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/rsx-function`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/docs/set-key-owner-resolver`,
      priority: 0.6,
      changeFrequency: 'monthly',
    },
  ];
}
