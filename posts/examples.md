## Convert from USD to EUR

```ts
const $ = api.rxjs;
const rsx = api.rsx;

// Web API (no key required)
const eurRate$ = $.interval(15000).pipe(
  $.startWith(0),
  $.switchMap(() =>
    $.from(
      fetch('https://api.frankfurter.app/latest?from=USD&to=EUR').then((r) =>
        r.json(),
      ),
    ),
  ),
  $.map((data) => data.rates.EUR),
  $.distinctUntilChanged(),
  $.tap((v) => console.log('[API] eurRate updated:', v)),
);

const model = {
  eurRate: eurRate$,
  usdAmount: 125,
  lastUpdated: Date.now(),

  expensiveRuns: 0,

  // EXPENSIVE: depends ONLY on eurRate + usdAmount
  expensiveUsdToEur(rate, amount) {
    model.expensiveRuns++;

    // simulate heavy work
    let acc = 0;
    for (let i = 0; i < 3_000_000; i++) {
      acc += Math.sin(i);
    }

    const result = Math.round(rate * amount * 100) / 100;
    console.log('[EXPENSIVE] run:', model.expensiveRuns, 'result:', result);
    return result;
  },

  // CHEAP: depends ONLY on lastUpdated
  formatTime(ms) {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  },
};

// Update ONLY lastUpdated every 2s (this IS part of the expression)
setInterval(() => {
  model.lastUpdated = Date.now();
  console.log('[MODEL] lastUpdated changed');
}, 2000);

// Update usdAmount occasionally (this SHOULD re-run the expensive branch)
setInterval(() => {
  model.usdAmount = 50 + Math.floor(Math.random() * 250);
  console.log('[MODEL] usdAmount changed:', model.usdAmount);
}, 11000);

// ✅ Single expression returning a result (no UI refs).
// It contains BOTH: expensive calc + lastUpdated-derived value.
return rsx(`
  ({
    usdAmount,
    eurRate,
    eurAmount: expensiveUsdToEur(eurRate, usdAmount),
    lastUpdated,
    lastUpdatedText: formatTime(lastUpdated),
    expensiveRuns
  })
`)(model);
```

## Clock

```ts
const rsx = api.rsx;

const model = {
  clock: new Date(),

  pad2(n) {
    return String(n).padStart(2, '0');
  },

  formatTime(d) {
    return (
      this.pad2(d.getHours()) +
      ':' +
      this.pad2(d.getMinutes()) +
      ':' +
      this.pad2(d.getSeconds())
    );
  },
};

// advance the clock every second
window.setInterval(() => {
  model.clock.setSeconds(model.clock.getSeconds() + 1);
}, 1000);

// expression returns digital time
return rsx(`
  formatTime(clock)
`)(model);
```
