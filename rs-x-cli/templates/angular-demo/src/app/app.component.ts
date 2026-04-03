import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  OnInit,
} from '@angular/core';

import { VirtualTableComponent } from './virtual-table/virtual-table.component';

type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [VirtualTableComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly _document = inject(DOCUMENT);
  @HostBinding('class.theme-dark') public isDarkTheme = false;
  public theme: ThemeMode = 'light';

  public ngOnInit(): void {
    this.theme = this.getInitialTheme();
    this.applyTheme(this.theme);
  }

  public toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.theme);
    window.localStorage.setItem('rsx-theme', this.theme);
  }

  private getInitialTheme(): ThemeMode {
    const storedTheme = window.localStorage.getItem('rsx-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return 'light';
  }

  private applyTheme(theme: ThemeMode): void {
    this.isDarkTheme = theme === 'dark';
    this._document.documentElement.setAttribute('data-theme', theme);
    this._document.body.setAttribute('data-theme', theme);
  }
}
