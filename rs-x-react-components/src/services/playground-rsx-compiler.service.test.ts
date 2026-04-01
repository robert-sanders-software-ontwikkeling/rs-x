import { validatePlaygroundScriptWithRsxCompiler } from './playground-rsx-compiler.service';

describe('validatePlaygroundScriptWithRsxCompiler', () => {
  it('accepts addition with BehaviorSubject constructor inference', async () => {
    const script = [
      'const model = {',
      '  a: 10,',
      '  b: new rxjs.BehaviorSubject(20),',
      '};',
      "return rsx('a + b')(model);",
    ].join('\n');
    const diagnostics = await validatePlaygroundScriptWithRsxCompiler(script);
    expect(diagnostics).toEqual([]);
  });

  it('accepts addition with BehaviorSubject explicit generic', async () => {
    const script = [
      'const model = {',
      '  a: 10,',
      '  b: new rxjs.BehaviorSubject<number>(20),',
      '};',
      "return rsx('a + b')(model);",
    ].join('\n');
    const diagnostics = await validatePlaygroundScriptWithRsxCompiler(script);
    expect(diagnostics).toEqual([]);
  });

  it('accepts addition when model value is interval/map/startWith observable', async () => {
    const diagnostics = await validatePlaygroundScriptWithRsxCompiler(
      [
        'const model = {',
        '  a: 10,',
        '  b: rxjs.interval(2000).pipe(',
        '    rxjs.map(() => Math.floor(Math.random() * 100)),',
        '    rxjs.startWith(20),',
        '  ),',
        '};',
        "return rsx('a + b')(model);",
      ].join('\n'),
    );

    expect(diagnostics).toEqual([]);
  });

  it('accepts supported playground RxJS combinations for numeric addition', async () => {
    const cases: Array<{ name: string; lines: string[] }> = [
      {
        name: 'BehaviorSubject direct',
        lines: [
          'const model = { a: 10, b: new rxjs.BehaviorSubject(20) };',
          "return rsx('a + b')(model);",
        ],
      },
      {
        name: 'BehaviorSubject explicit generic',
        lines: [
          'const model = { a: 10, b: new rxjs.BehaviorSubject<number>(20) };',
          "return rsx('a + b')(model);",
        ],
      },
      {
        name: 'Subject with startWith',
        lines: [
          'const subject = new rxjs.Subject<number>();',
          'const model = { a: 10, b: subject.pipe(rxjs.startWith(20)) };',
          "return rsx('a + b')(model);",
        ],
      },
      {
        name: 'ReplaySubject with startWith',
        lines: [
          'const replay = new rxjs.ReplaySubject<number>(1);',
          'const model = { a: 10, b: replay.pipe(rxjs.startWith(20)) };',
          "return rsx('a + b')(model);",
        ],
      },
      {
        name: 'AsyncSubject with startWith',
        lines: [
          'const asyncSubject = new rxjs.AsyncSubject<number>();',
          'const model = { a: 10, b: asyncSubject.pipe(rxjs.startWith(20)) };',
          "return rsx('a + b')(model);",
        ],
      },
      {
        name: 'interval + map + startWith',
        lines: [
          'const model = {',
          '  a: 10,',
          '  b: rxjs.interval(2000).pipe(',
          '    rxjs.map(() => Math.floor(Math.random() * 100)),',
          '    rxjs.startWith(20),',
          '  ),',
          '};',
          "return rsx('a + b')(model);",
        ],
      },
      {
        name: 'timer + map + startWith',
        lines: [
          'const model = {',
          '  a: 10,',
          '  b: rxjs.timer(2000).pipe(',
          '    rxjs.map(() => 5),',
          '    rxjs.startWith(20),',
          '  ),',
          '};',
          "return rsx('a + b')(model);",
        ],
      },
    ];

    for (const testCase of cases) {
      const diagnostics = await validatePlaygroundScriptWithRsxCompiler(
        testCase.lines.join('\n'),
      );
      expect(diagnostics).toEqual([]);
    }
  });
});
