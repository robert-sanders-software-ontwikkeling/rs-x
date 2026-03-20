import { Observable, Subject } from 'rxjs';
import { IWebComponentThemeManager } from '../web-component/interfaces';

export class WebComponentThemeManagerMock implements IWebComponentThemeManager {
   private readonly _themeChanged = new Subject<void>();
   public theme!: string;
   public themes: string[] = [];

   public get themeChanged(): Observable<void> {
      return this._themeChanged;
   }

   public emitThemeChanged(): void {
      this._themeChanged.next();
   }

   public registerTheme = jest.fn();
   public unregisterTheme = jest.fn();
   public getComponentTheme = jest.fn();
}
