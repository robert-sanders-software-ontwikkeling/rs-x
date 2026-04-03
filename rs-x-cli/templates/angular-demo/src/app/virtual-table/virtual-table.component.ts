import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { RsxPipe } from '@rs-x/angular';

import { type RowView,VirtualTableModel } from './virtual-table-model';

@Component({
  selector: 'rsx-virtual-table',
  standalone: true,
  imports: [CommonModule, RsxPipe],
  templateUrl: './virtual-table.component.html',
  styleUrls: ['./virtual-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualTableComponent implements AfterViewInit, OnDestroy {
  private static readonly COMPACT_BREAKPOINT_PX = 720;
  private static readonly DEFAULT_ROW_HEIGHT = 36;
  private static readonly COMPACT_ROW_HEIGHT = 168;

  public readonly state = new VirtualTableModel();

  @ViewChild('scrollViewport', { static: true })
  private readonly scrollViewport?: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;

  public ngAfterViewInit(): void {
    const viewport = this.scrollViewport?.nativeElement;
    if (!viewport) {
      return;
    }

    this.syncViewportMetrics(viewport);
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.state.setViewportHeight(entry.contentRect.height);
        this.state.setRowHeight(
          entry.contentRect.width <= VirtualTableComponent.COMPACT_BREAKPOINT_PX
            ? VirtualTableComponent.COMPACT_ROW_HEIGHT
            : VirtualTableComponent.DEFAULT_ROW_HEIGHT,
        );
      }
    });
    this.resizeObserver.observe(viewport);
  }

  public ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  public onScroll(event: Event): void {
    const target = event.target as HTMLDivElement | null;
    if (!target) {
      return;
    }
    this.state.setScrollTop(target.scrollTop);
  }

  public toggleSort(key: 'id' | 'name' | 'price' | 'quantity'): void {
    this.state.toggleSort(key);
  }

  public trackByIndex(_: number, item: RowView): number {
    return item.index;
  }

  private syncViewportMetrics(viewport: HTMLDivElement): void {
    this.state.setViewportHeight(viewport.clientHeight);
    this.state.setRowHeight(
      viewport.clientWidth <= VirtualTableComponent.COMPACT_BREAKPOINT_PX
        ? VirtualTableComponent.COMPACT_ROW_HEIGHT
        : VirtualTableComponent.DEFAULT_ROW_HEIGHT,
    );
  }
}
