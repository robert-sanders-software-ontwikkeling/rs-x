defaults:
  model: import('./rsx-file-model.fixture').IModel

expression: mismatch
  return: string
  lines.length

expression: stringMismatch
  return: number
  user.name

expression: dateMismatch
  return: Date
  lines.length

expression: valid
  lines.reduce((sum, line) => sum + line.lineTotal, 0)
