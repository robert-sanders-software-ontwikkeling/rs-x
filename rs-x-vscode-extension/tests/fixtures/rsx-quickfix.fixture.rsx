model: import('../../../rs-x-compiler/tests/fixtures/rsx-file-model.fixture').IModel
return: number

lines.reduce((sum, line) => sum + line.lineTotl, 0)
