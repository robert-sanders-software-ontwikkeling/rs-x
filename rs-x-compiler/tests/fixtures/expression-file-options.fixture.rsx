model: import('./rsx-file-model.fixture').IModel
return: number
lazyGroup: "shipping"
preparse: false
compile: false

lines.reduce((sum, line) => sum + line.lineTotal, 0)
