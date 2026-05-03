import type {
  CustomerTier,
  QuoteCountry,
} from './rsx-tester-contract-types.fixture';

export interface ShippingQuoteModelContract {
  customerTier: CustomerTier;
  country: QuoteCountry;
  destinationsByCode: Record<string, ShippingDestinationContract>;
  destination: ShippingDestinationContract;
  hazmat: boolean;
  lines: QuoteLineContract[];
  scoresByCode: Record<string, number>;
}

export interface ShippingDestinationContract {
  city: string;
  priority: 'standard' | 'rush';
}

export interface QuoteLineContract {
  sku: string;
  quantity: number;
}
