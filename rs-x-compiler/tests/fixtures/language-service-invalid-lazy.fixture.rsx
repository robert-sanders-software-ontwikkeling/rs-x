defaults:
  model: import('./rsx-file-model.fixture').IModel

expression: invalidLazy
  preparse: false
  compiled: false
  lazy: true
  lines.length

expression: invalidLazyGroup
  preparse: false
  compiled: false
  lazyGroup: shipping
  lines.length

expression: invalidLazyWithLazyGroup
  compiled: true
  lazy: true
  lazyGroup: shipping
  lines.length

expression: validLazy
  preparse: true
  lazy: true
  lines.length

expression: validCompiledLazy
  preparse: false
  compiled: true
  lazy: true
  lines.length

expression: validCompiledLazyGroup
  preparse: false
  compiled: true
  lazyGroup: shipping
  lines.length
