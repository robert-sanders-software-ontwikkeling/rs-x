defaults:
  model: import('./rsx-file-model.fixture').IModel
  lazyGroup: shipping

expression: total
  return: number
lines.reduce((sum, line) => sum + line.lineTotal, 0)

expression: firstLineName
  return: string
  compile: false
lines[0].name
