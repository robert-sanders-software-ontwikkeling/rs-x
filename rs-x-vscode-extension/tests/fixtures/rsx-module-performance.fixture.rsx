defaults:
  model: { country: string; hazmat: boolean; weightKg: number; minWeightKg: number; maxWeightKg: number; discountPercent: number; lines: Array<{ id: number; name: string; qty: number; unitPrice: number }> }

expression: shippingMethodRsx
  return: string
(country === 'NL' && !hazmat && weightKg > 10) || weightKg >= 25 ? 'GROUND' : 'AIR'

expression: lineTotalsRsx
  return: Array<{ id: number; lineTotal: number }>
lines.map((line) => ({ id: line.id, lineTotal: line.qty * line.unitPrice }))

expression: subtotalRsx
  return: number
lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)

expression: discountedSubtotalRsx
  return: number
subtotalRsx(model) * (1 - discountPercent / 100)

expression: hasHeavyItemsRsx
  return: boolean
lines.some((line) => line.qty * line.unitPrice > 500)

expression: hasLightShipmentRsx
  return: boolean
weightKg >= minWeightKg && weightKg <= maxWeightKg

expression: restrictedShipmentRsx
  return: boolean
hazmat && (country === 'US' || country === 'CA')

expression: itemCountRsx
  return: number
lines.reduce((sum, line) => sum + line.qty, 0)

expression: expensiveLineNamesRsx
  return: Array<string>
lines.filter((line) => line.unitPrice >= 100).map((line) => line.name)

expression: hasAnyLinesRsx
  return: boolean
lines.length > 0

expression: firstLineNameRsx
  return: string
lines.length > 0 ? lines[0].name : ''

expression: taxRateRsx
  return: number
country === 'NL' ? 21 : 0

expression: taxAmountRsx
  return: number
discountedSubtotalRsx(model) * (taxRateRsx(model) / 100)

expression: totalWithTaxRsx
  return: number
discountedSubtotalRsx(model) + taxAmountRsx(model)
