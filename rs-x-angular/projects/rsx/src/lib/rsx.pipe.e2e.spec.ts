import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  unloadRsXExpressionParserModule
} from '@rs-x/expression-parser';
import { providexRsx} from './rsx.providers';
import { RsxPipe } from './rsx.pipe';

@Component({
  template: `{{ expression | rsx: ctx }}`,
  imports: [RsxPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestHostComponent {
  public ctx = {
    x: 100
  };
  public expression: string = 'x * 2';
}

describe('RsxPipe Integration', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: providexRsx(),
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
  });

  it('evaluates a simple expression', async () => {
    fixture.detectChanges();
    await Promise.resolve(); // wait for async parser to initialize
    fixture.detectChanges();

    const rendered = fixture.nativeElement.textContent.trim();
    expect(rendered).toBe('200'); // 100 * 2
  });

  it('reacts to value changes', async () => {
    component.ctx.x = 200;

    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    let rendered = fixture.nativeElement.textContent.trim();
    expect(rendered).toBe('400');

  });

  it('reacts to context changes', async () => {
    component.ctx = { x: 1000 };

    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    let rendered = fixture.nativeElement.textContent.trim();
    expect(rendered).toBe('2000');

  });

  it('reacts to expression changes', async () => {
    component.expression = '(x + 3) * 2'

    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    let rendered = fixture.nativeElement.textContent.trim();
    expect(rendered).toBe('206');

  });
});