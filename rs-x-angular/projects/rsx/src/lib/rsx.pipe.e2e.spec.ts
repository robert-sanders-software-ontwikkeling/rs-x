import {
  ApplicationInitStatus,
  ChangeDetectionStrategy,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { rsx, unloadRsXExpressionParserModule } from '@rs-x/expression-parser';

import { RsxPipe } from './rsx.pipe';
import { providexRsx } from './rsx.providers';

@Component({
  standalone: true,
  template: `{{ expression | rsx: ctx }}`,
  imports: [RsxPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestHostComponent {
  public ctx = {
    x: 100,
  };
  public expression: string = 'x * 2';
}

type TestRow = {
  id: number;
  name: string;
};

type TestExpression<T> = ReturnType<ReturnType<typeof rsx<T>>>;

type TestRowView = {
  row: {
    idExpr: TestExpression<number>;
    nameExpr: TestExpression<string>;
  };
};

@Component({
  standalone: true,
  imports: [CommonModule, RsxPipe],
  template: `
    <div
      class="row"
      *ngFor="let item of rowsExpression | rsx; trackBy: trackByIndex"
    >
      <span class="id">{{ item.row.idExpr | rsx }}</span>
      <span class="name">{{ item.row.nameExpr | rsx }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class NgForHostComponent implements OnInit {
  public readonly rowsModel = {
    rows: [] as TestRowView[],
  };
  public rowsExpression?: TestExpression<TestRowView[]>;

  public ngOnInit(): void {
    this.rowsExpression = rsx<TestRowView[]>('rows')(this.rowsModel);
  }

  public setRows(rows: TestRow[]): void {
    this.rowsModel.rows = rows.map((row) => {
      const model = { ...row };

      return {
        row: {
          idExpr: rsx<number>('id')(model),
          nameExpr: rsx<string>('name')(model),
        },
      };
    });
  }

  public trackByIndex(index: number): number {
    return index;
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, RsxPipe],
  template: `
    <div *ngFor="let item of rowsExpression | rsx; trackBy: trackByIndex">
      <span class="value">{{ item.valueExpr | rsx }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ReusedExternalExpressionHostComponent implements OnInit {
  public readonly rowsModel = {
    rows: [] as Array<{
      key: number;
      valueExpr: TestExpression<number>;
    }>,
  };
  public rowsExpression?: TestExpression<
    Array<{
      key: number;
      valueExpr: TestExpression<number>;
    }>
  >;

  private readonly sharedModel = { value: 1 };
  private readonly sharedExpression = rsx<number>('value')(this.sharedModel);

  public ngOnInit(): void {
    this.rowsExpression = rsx<typeof this.rowsModel.rows>('rows')(this.rowsModel);
  }

  public setVisible(isVisible: boolean): void {
    this.rowsModel.rows = isVisible
      ? [{ key: 1, valueExpr: this.sharedExpression }]
      : [];
  }

  public updateValue(nextValue: number): void {
    this.sharedModel.value = nextValue;
  }

  public trackByIndex(_: number, item: { key: number }): number {
    return item.key;
  }
}

describe('RsxPipe Integration', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

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
    component.expression = '(x + 3) * 2';

    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    let rendered = fixture.nativeElement.textContent.trim();
    expect(rendered).toBe('206');
  });
});

describe('RsxPipe Integration with ngFor', () => {
  let fixture: ComponentFixture<NgForHostComponent>;
  let component: NgForHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: providexRsx(),
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;
    fixture = TestBed.createComponent(NgForHostComponent);
    component = fixture.componentInstance;
  });

  it('renders rows from an expression-backed collection', async () => {
    component.setRows([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = Array.from(
      fixture.nativeElement.querySelectorAll('.row'),
    ) as HTMLDivElement[];

    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelector('.id')?.textContent?.trim()).toBe('1');
    expect(rows[0]?.querySelector('.name')?.textContent?.trim()).toBe('Alpha');
    expect(rows[1]?.querySelector('.id')?.textContent?.trim()).toBe('2');
    expect(rows[1]?.querySelector('.name')?.textContent?.trim()).toBe('Beta');
  });

  it('keeps reused external expressions alive across ngFor view removal', async () => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        providers: providexRsx(),
      })
      .compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;

    const reusedFixture = TestBed.createComponent(
      ReusedExternalExpressionHostComponent,
    );
    const reusedComponent = reusedFixture.componentInstance;

    reusedComponent.setVisible(true);
    reusedFixture.detectChanges();
    await reusedFixture.whenStable();
    reusedFixture.detectChanges();

    expect(
      reusedFixture.nativeElement
        .querySelector('.value')
        ?.textContent?.trim(),
    ).toBe('1');

    reusedComponent.setVisible(false);
    reusedFixture.detectChanges();
    await reusedFixture.whenStable();
    reusedFixture.detectChanges();

    reusedComponent.updateValue(7);
    reusedComponent.setVisible(true);
    reusedFixture.detectChanges();
    await reusedFixture.whenStable();
    reusedFixture.detectChanges();

    expect(
      reusedFixture.nativeElement
        .querySelector('.value')
        ?.textContent?.trim(),
    ).toBe('7');
  });
});

afterAll(async () => {
  await unloadRsXExpressionParserModule();
});
