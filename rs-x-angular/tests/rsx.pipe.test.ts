import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { RsxPipe } from '../lib/rsx.pipe';

describe('RsxPipe', () => {
  let pipe: RsxPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RsxPipe]
    });

    pipe = TestBed.inject(RsxPipe);
  });

  it('evaluates a simple expression', () => {
    const ctx = { x: 10 };
    const result = pipe.transform('x + 2', ctx);

    expect(result).toBe(12);
  });

  it('reacts to observable changes', () => {
    const value$ = new BehaviorSubject(1);
    const ctx = { value: value$ };

    const initial = pipe.transform('value + 1', ctx);
    expect(initial).toBe(2);

    value$.next(5);

    const updated = pipe.transform('value + 1', ctx);
    expect(updated).toBe(6);
  });

  it('cleans up expressions on destroy', () => {
    const disposeSpy = jest.spyOn(pipe as any, 'disposeExpression');

    pipe.ngOnDestroy();

    expect(disposeSpy).toHaveBeenCalled();
  });
});