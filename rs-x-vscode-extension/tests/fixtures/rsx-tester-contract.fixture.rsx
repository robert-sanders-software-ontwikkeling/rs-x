model: import('./rsx-tester-model-contract.fixture').ShippingQuoteModelContract
return: boolean

customerTier === 'enterprise' &&
  country === 'DE' &&
  destinationsByCode['home'].priority === 'rush' &&
  lines[1].quantity > 0 &&
  scoresByCode['home'] >= 0 &&
  hazmat
