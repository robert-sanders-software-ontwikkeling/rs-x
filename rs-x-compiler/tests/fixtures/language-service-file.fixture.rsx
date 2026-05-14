model: import('./rsx-file-model.fixture').IModel
return: number

lines.reduce((sum, line) => sum + line.q, 0)
