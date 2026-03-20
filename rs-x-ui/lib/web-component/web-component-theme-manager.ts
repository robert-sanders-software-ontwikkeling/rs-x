import {
   IErrorLog,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import { Observable, Subject } from 'rxjs';
import { IDomService } from '../dom-service';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import {
   ITheme,
   IWebComponentThemeManager,
   WebComponentElementConstructor,
} from './interfaces';

export const defaultThemeName = 'default';

const themeId = 'Theme4b492347-a7a8-4bcf-b8e0-e56d1f35ed86';

@Injectable()
export class WebComponentThemeManager implements IWebComponentThemeManager {
   public readonly maxZIndex = 2147483647;
   private _theme!: string;
   private readonly _themes = new Map<string, ITheme>();
   private readonly _themeChanged = new Subject<void>();

   constructor(
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog,
      @Inject(RsXUIInjectionTokens.IDomWindow)
      private readonly _domService: IDomService

   ) {}

   public get theme(): string {
      return this._theme ? this._theme : defaultThemeName;
   }

   public set theme(value: string) {
      if (this._theme !== value) {
         this._theme = value;

         let themeLink= this._domService.query<HTMLLinkElement>(
            `#${themeId}`
         ).nativeElement;
         if (themeLink) {
            themeLink.remove();
         }

         const theme = this._themes.get(this._theme);
         if (theme) {
            themeLink = this._domService.createElement<HTMLLinkElement>('link').nativeElement;
            themeLink.rel = 'stylesheet';
            themeLink.id = themeId;
            themeLink.type = 'text/css';
            themeLink.href = theme.themeCssFile;
            document.head.appendChild(themeLink);
         }
         this._themeChanged.next();
      }
   }

   public get themes(): string[] {
      return Array.from(this._themes.keys());
   }

   public get themeChanged(): Observable<void> {
      return this._themeChanged;
   }

   public registerTheme(name: string, theme: ITheme): void {
      this._themes.set(name, theme);
   }
   public unregisterTheme(name: string): void {
      this._themes.delete(name);
   }

   public getComponentTheme(
      componentType: WebComponentElementConstructor
   ): string | undefined {
      return this.getCurrentTheme()?.componentStyles?.get(componentType);
   }

   private getCurrentTheme(): ITheme | undefined {
      let currentTheme = this._themes.get(this.theme);
      if (!currentTheme) {
         currentTheme = this._themes.get(defaultThemeName);
      }

      if (!currentTheme) {
         this._errorLog.add({
            message: `Probably you haven't registered a theme.`,
            context: this,
         });
      }
      return currentTheme;
   }
}

export function pixelsToRem(pixels: number, baseFontSize: number): string {
   return `${pixels / baseFontSize}rem`;
}

export enum ArrowSide {
   Left,
   Top,
   Right,
   Bottom,
}
export enum ArrowPosition {
   Left,
   Top,
   Right,
   Bottom,
   Center,
}

function addArrowSideStyle(
   side: ArrowSide,
   arrowSize: number,
   arrowColor: string,
   offset: number,
   stringBuilder: string[]
): void {
   const styleBuilder = {
      [ArrowSide.Top]: () => {
         stringBuilder.push(`border-bottom-color: ${arrowColor};`);
         stringBuilder.push(`top: ${-2 * arrowSize + offset}px;`);
      },
      [ArrowSide.Bottom]: () => {
         stringBuilder.push(`border-top-color: ${arrowColor};`);
         stringBuilder.push(`bottom: ${-2 * arrowSize + offset}px;`);
      },
      [ArrowSide.Left]: () => {
         stringBuilder.push(`border-right-color: ${arrowColor};`);
         stringBuilder.push(`left: ${-2 * arrowSize + offset}px;`);
      },
      [ArrowSide.Right]: () => {
         stringBuilder.push(`border-left-color: ${arrowColor};`);
         stringBuilder.push(`right: ${-2 * arrowSize + offset}px;`);
      },
   };

   styleBuilder[side]?.();
}

function addArrowVAlignStyle(
   align: ArrowPosition,
   arrowSize: number,
   margin: number,
   stringBuilder: string[]
): void {
   const styleBuilders = {
      [ArrowPosition.Center]: () => {
         stringBuilder.push(`right: 50%;`);
         stringBuilder.push(`margin-right: ${-arrowSize}px;`);
      },
      [ArrowPosition.Left]: () => {
         stringBuilder.push(`left:${margin}px;`);
      },
      [ArrowPosition.Right]: () => {
         stringBuilder.push(`right:${margin}px;`);
      },
   };

   styleBuilders[align]?.();
}

function addArrowHAlignStyle(
   align: ArrowPosition,
   arrowSize: number,
   margin: number,
   stringBuilder: string[]
): void {
   const styleBuilders = {
      [ArrowPosition.Center]: () => {
         stringBuilder.push(`top: 50%;`);
         stringBuilder.push(`margin-top: ${-arrowSize}px;`);
      },
      [ArrowPosition.Top]: () => {
         stringBuilder.push(`top:${margin}px;`);
      },
      [ArrowPosition.Bottom]: () => {
         stringBuilder.push(`bottom:${margin}px;`);
      },
   };

   styleBuilders[align]?.();
}

function addArrowAlignStyle(
   side: ArrowSide,
   align: ArrowPosition,
   arrowSize: number,
   margin: number,
   stringBuilder: string[]
): void {
   const styleBuilders = {
      [ArrowSide.Top]: addArrowVAlignStyle,
      [ArrowSide.Bottom]: addArrowVAlignStyle,
      [ArrowSide.Left]: addArrowHAlignStyle,
      [ArrowSide.Right]: addArrowHAlignStyle,
   };

   return styleBuilders[side]?.(align, arrowSize, margin, stringBuilder);
}

function createArrow(
   arrowSize: number,
   arrowColor: string,
   margin: number,
   side: ArrowSide,
   align: ArrowPosition,
   offset = 0
): string {
   const stringBuilder: string[] = [];
   addArrowSideStyle(side, arrowSize, arrowColor, offset, stringBuilder);
   addArrowAlignStyle(side, align, arrowSize, margin, stringBuilder);
   return stringBuilder.join('');
}

export function cssArrow(
   classSelector: string,
   side: ArrowSide,
   align: ArrowPosition,
   size: number,
   color: string,
   borderColor: string,
   borderSize: number
): string {
   const selector =
      borderColor === 'none'
         ? `.${classSelector}:after`
         : `.${classSelector}:after, .${classSelector}:before`;
   let css = `
        ${selector} {
            border: solid transparent;
            content: " ";
            height: 0;
            width: 0;
            position: absolute;
            pointer-events: none;
            visibility: visible;
        }

        .${classSelector}:after {
            border-width: ${size}px;
            ${createArrow(size, color, size, side, align, 1)}
        }
    `;
   if (borderColor !== 'none') {
      css += `
            .${classSelector}:before {
                border-width: ${borderSize + size}px;
                ${createArrow(
                   borderSize + size,
                   borderColor,
                   size - borderSize,
                   side,
                   align
                )}
            }
        `;
   }
   return css;
}
