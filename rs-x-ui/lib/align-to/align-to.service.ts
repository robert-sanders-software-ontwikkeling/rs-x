import { ArgumentException, Assertion, Inject, Injectable } from '@rs-x/core';
import { IDomElement } from '../dom-element/dom-element.interface';
import { IDomService } from '../dom-service/dom-service.interface';
import { IAlignToService } from './align-to-service.interface';
import { HAlignSide, xAlternativeSide } from './halign-side.enum';
import { IPosition } from './position.interface';
import { VAlignSide, yAlternativeSide } from './valign-side.enum';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';

interface HAlignSides {
   xTargetAlignToSide: HAlignSide;
   xAlignSide: HAlignSide;
}

interface VAlignSides {
   yTargetAlignToSide: VAlignSide;
   yAlignSide: VAlignSide;
}

interface IMaximizeHeightInfo {
   availableHeight: number;
   top: number;
}

@Injectable()
export class AlignToService implements IAlignToService {
   public target!: IDomElement;
   public xAlignTarget?: IDomElement;
   public yAlignTarget?: IDomElement;
   public alignWidth = false;
   public allowFlip = true;
   private _maximizeHeight = false;
   private _xTargetAlignToSide!: HAlignSide;
   private _yTargetAlignToSide!: VAlignSide;
   private _xAlignSide!: HAlignSide;
   private _yAlignSide!: VAlignSide;
   private _offset!: number;
   private _currentXTargetAlignToSide!: HAlignSide;
   private _currentYTargetAlignToSide!: VAlignSide;
   private _currentXAlignSide!: HAlignSide;
   private _currentYAlignSide!: VAlignSide;
   private _alignedToTop = false;

   constructor(
      @Inject(RsXUIInjectionTokens.IDomService)
      private readonly _domService: IDomService
   ) {}

   public get alignedToTop(): boolean {
      return this._alignedToTop;
   }

   public get currentXTargetAlignToSide(): HAlignSide {
      return this._currentXTargetAlignToSide;
   }

   public get currentYTargetAlignToSide(): VAlignSide {
      return this._currentYTargetAlignToSide;
   }

   public get currentXAlignSide(): HAlignSide {
      return this._currentXAlignSide;
   }

   public get currentYAlignSide(): VAlignSide {
      return this._currentYAlignSide;
   }

   public get xTargetAlignToSide(): HAlignSide {
      return this._xTargetAlignToSide ?? HAlignSide.Left;
   }

   public set xTargetAlignToSide(value: HAlignSide) {
      this._xTargetAlignToSide = value;
   }

   public get yTargetAlignToSide(): VAlignSide {
      return this._yTargetAlignToSide ?? VAlignSide.Bottom;
   }

   public set yTargetAlignToSide(value: VAlignSide) {
      this._yTargetAlignToSide = value;
   }

   public get xAlignSide(): HAlignSide {
      return this._xAlignSide ?? HAlignSide.Left;
   }

   public set xAlignSide(value: HAlignSide) {
      this._xAlignSide = value;
   }

   public get yAlignSide(): VAlignSide {
      return this._yAlignSide ?? VAlignSide.Top;
   }

   public set yAlignSide(value: VAlignSide) {
      this._yAlignSide = value;
   }

   public get offset(): number {
      return this._offset ?? 0;
   }

   public set offset(value: number) {
      this._offset = value;
   }

   public updatePosition(): void {
      Assertion.assertNotNullOrUndefined(this.target, 'target');
      Assertion.assertNotNullOrUndefined(this.xAlignTarget, 'xAlignTarget');
      Assertion.assertNotNullOrUndefined(this.yAlignTarget, 'yAlignTarget');

      if (this.alignWidth) {
         this.target.outerWidth = this.xAlignTarget.outerWidth;
      }

      const { xTargetAlignToSide, xAlignSide } = this.getHAlignSides();
      this.tryToSetLeft(xTargetAlignToSide, xAlignSide, []);
      this.target.setCssAttributeValues({
         height: 'auto',
      });
      // this.targetContent?.setCssAttributeValues({
      //    height: 'auto',
      // });

      const { yTargetAlignToSide, yAlignSide } = this.getVAlignSides();
      this.tryToSetTop(yTargetAlignToSide, yAlignSide, []);
      // this.targetContent?.setCssAttributeValues({
      //    height: '100%',
      // });
   }

   private tryToSetLeft(
      xTargetAlignSide: HAlignSide,
      xPopupAlignSide: HAlignSide,
      triedSides: string[]
   ) {
      this.setLeft(xTargetAlignSide, xPopupAlignSide);
      if (!this.validateLeft()) {
         triedSides.push(xTargetAlignSide);
         xTargetAlignSide = xAlternativeSide[xTargetAlignSide];
         if (!triedSides.includes(xTargetAlignSide)) {
            this.tryToSetLeft(
               xTargetAlignSide,
               xAlternativeSide[xPopupAlignSide],
               triedSides
            );
         }
      } else {
         this._currentXTargetAlignToSide = xTargetAlignSide;
         this._currentXAlignSide = xPopupAlignSide;
      }
   }
   private tryToSetTop(
      yTargetAlignToSide: VAlignSide,
      yAlignSide: VAlignSide,
      triedSides: string[]
   ) {
      this.setTop(yTargetAlignToSide, yAlignSide);
      if (!this.validateTop()) {
         if (this.allowFlip) {
            triedSides.push(yTargetAlignToSide);
            yTargetAlignToSide = yAlternativeSide[yTargetAlignToSide];
            if (!triedSides.includes(yTargetAlignToSide)) {
               this.tryToSetTop(
                  yTargetAlignToSide,
                  yAlternativeSide[yAlignSide],
                  triedSides
               );
            } else {
               this.maximizeHeight(
                  this.yTargetAlignToSide,
                  this.yAlignSide,
                  this.allowFlip
               );
            }
         } else {
            this.maximizeHeight(yTargetAlignToSide, yAlignSide, false);
         }
      } else {
         this._currentYTargetAlignToSide = yTargetAlignToSide;
         this._currentYAlignSide = yAlignSide;
      }
   }

   private setTopCommands = {
      [VAlignSide.Top]: (targetTop: number) => {
         this.target.top = targetTop;
         this._alignedToTop = false;
      },
      [VAlignSide.Bottom]: (targetTop: number, height: number) => {
         this.target.top = targetTop - this.calculateHeight();
         this._alignedToTop = true;
         this.target.innerHeight = height;
      },
      [VAlignSide.Center]: (targetTop: number, height: number) => {
         this.target.top = targetTop - height / 2;
      },
   };
   private setTop(alignToSide: VAlignSide, alignSide: VAlignSide): void {
      if (!this.setTopCommands[alignSide]) {
         throw new ArgumentException(
            `Invalid vertical align side ${alignSide}`
         );
      }

      Assertion.assertNotNullOrUndefined(this.yAlignTarget, 'yAlignTarget');

      const targetTop =
         this.getY(this.yAlignTarget, alignToSide) +
         this.getOffset(alignToSide, alignSide);
      const height = this.calculateHeight();

      this.setTopCommands[alignSide](targetTop, height);
      this.target.innerHeight = height;
   }

   private setLeftCommands = {
      [HAlignSide.Left]: (targetLeft: number) => {
         this.target.left = targetLeft;
      },
      [HAlignSide.Right]: (targetLeft: number) => {
         this.target.left = targetLeft - this.target.outerWidth;
      },
      [HAlignSide.Center]: (targetLeft: number) => {
         this.target.left = targetLeft - this.target.outerWidth / 2;
      },
   };

   private setLeft(alignToSide: HAlignSide, alignSide: HAlignSide): void {
      if (!this.setLeftCommands[alignSide]) {
         throw new ArgumentException(
            `Invalid horizonal align side ${alignSide}`
         );
      }

      Assertion.assertNotNullOrUndefined(this.xAlignTarget, 'xAlignTarget');

      const targetLeft =
         this.getX(this.xAlignTarget, alignToSide) +
         this.getOffset(alignToSide, alignSide);
      this.setLeftCommands[alignSide](targetLeft);
   }

   private getXCommands = {
      [HAlignSide.Left]: (
         offset: IPosition,
         target: IDomElement<HTMLElement>
      ) => offset.left - target.scrollLeft,
      [HAlignSide.Right]: (
         offset: IPosition,
         target: IDomElement<HTMLElement>
      ) => offset.left + target.outerWidth,
      [HAlignSide.Center]: (
         offset: IPosition,
         target: IDomElement<HTMLElement>
      ) => offset.left + target.outerWidth / 2,
   };

   private getX(target: IDomElement, alignSide: HAlignSide): number {
      if (!this.getXCommands[alignSide]) {
         throw new ArgumentException(
            `Invalid horizonal align side ${alignSide}`
         );
      }

      return (
         this.getXCommands[alignSide](target.offset, target) -
         this._domService.scrollX
      );
   }

   private getYCommands = {
      [VAlignSide.Top]: (offset: IPosition) => offset.top,
      [VAlignSide.Bottom]: (
         offset: IPosition,
         target: IDomElement<HTMLElement>
      ) => offset.top + target.outerHeight,
      [VAlignSide.Center]: (
         offset: IPosition,
         target: IDomElement<HTMLElement>
      ) => offset.top + target.outerHeight / 2,
   };

   private getY(target: IDomElement, alignSide: VAlignSide): number {
      if (!this.getYCommands[alignSide]) {
         throw new ArgumentException(
            `Invalid vertical align side ${alignSide}`
         );
      }

      const offset = target.offset;

      return Math.max(
         this.getYCommands[alignSide](offset, target) -
            this._domService.scrollY,
         0
      );
   }

   private getOffset(
      alignToSide: VAlignSide | HAlignSide,
      alignSide: VAlignSide | HAlignSide
   ): number {
      if (alignToSide === alignSide) {
         return 0;
      } else {
         const factor =
            alignToSide == VAlignSide.Top || alignToSide == HAlignSide.Left
               ? -1
               : 1;
         return factor * this.offset;
      }
   }

   private validateLeft(): boolean {
      const left = this.target.offset.left - this._domService.scrollX;
      return (
         left >= 0 &&
         left + this.target.outerWidth <= this._domService.windowWidth
      );
   }
   private validateTop(): boolean {
      const top = this.target.offset.top;
      return (
         top >= 0 &&
         top + this.target.outerHeight <= this._domService.windowHeight
      );
   }

   private calculateHeight(): number {
      let contentHeight;
      if (this._maximizeHeight) {
         const top = this.target.offset.top;
         contentHeight = this._domService.windowHeight - top;

         if (this.yAlignSide !== VAlignSide.Top) {
            contentHeight = contentHeight + top;
         }
      } else {
         contentHeight =
            /*this.targetContentContainer ??*/ this.target.outerHeight;
      }

      return this.constrainHeight(contentHeight);
   }

   private constrainHeight(height: number): number {
      const maxHeight = parseInt(
         this.target.getCssAttributeValue('max-height'),
         10
      );
      if (!isNaN(maxHeight)) {
         return Math.min(height, maxHeight);
      }

      return height;
   }

   private maximizeHeightCommands = {
      [VAlignSide.Top]: {
         [VAlignSide.Top]: (maximizeHeightInfo: IMaximizeHeightInfo) => {
            this.target.top = maximizeHeightInfo.top;
            this.target.setCssAttributeValues({
               opacity: '1',
            });
            this.target.innerHeight = maximizeHeightInfo.availableHeight;
            this._alignedToTop = true;
         },
         [VAlignSide.Bottom]: (maximizeHeightInfo: IMaximizeHeightInfo) => {
            this.target.top = 0;
            this.target.setCssAttributeValues({
               opacity: '1',
            });
            this.target.innerHeight =
               maximizeHeightInfo.top + this._domService.scrollY;
            this._alignedToTop = true;
         },
      },
      [VAlignSide.Bottom]: {
         [VAlignSide.Top]: (maximizeHeightInfo: IMaximizeHeightInfo) => {
            this.target.top = maximizeHeightInfo.top;
            this.target.setCssAttributeValues({
               opacity: '1',
            });
            this.target.innerHeight = maximizeHeightInfo.availableHeight;
            this._alignedToTop = false;
         },
         [VAlignSide.Bottom]: (maximizeHeightInfo: IMaximizeHeightInfo) => {
            this.target.top = 0;
            this.target.setCssAttributeValues({
               opacity: '1',
            });
            this.target.innerHeight = maximizeHeightInfo.top;
            this._alignedToTop = false;
         },
      },
   };

   private maximizeHeight(
      yTargetAlignToSide: VAlignSide,
      yAlignSide: VAlignSide,
      allowFlip = true
   ) {

      Assertion.assertNotNullOrUndefined(this.yAlignTarget, 'yAlignTarget');
      const top = Math.max(this.getY(this.yAlignTarget, yTargetAlignToSide), 0);
      const availableHeight = this._domService.windowInnerHeight - top;

      if (
         allowFlip &&
         ((availableHeight < top && yAlignSide === VAlignSide.Top) ||
            (availableHeight > top && yAlignSide === VAlignSide.Bottom))
      ) {
         this.maximizeHeight(
            yAlternativeSide[yTargetAlignToSide],
            yAlternativeSide[yAlignSide],
            false
         );
         return;
      }

      if (!this.maximizeHeightCommands[yTargetAlignToSide]?.[yAlignSide]) {
         throw new ArgumentException(
            `Unsupported vertical align side combination ${yAlignSide}-${yTargetAlignToSide}`
         );
      }

      this.maximizeHeightCommands[yTargetAlignToSide][yAlignSide]({
         availableHeight,
         top,
      });

      this._currentYTargetAlignToSide = yTargetAlignToSide;
      this._currentYAlignSide = yAlignSide;
   }

   private getHAlignSides(): HAlignSides {
      return {
         xTargetAlignToSide: this.currentXTargetAlignToSide
            ? this.currentXTargetAlignToSide
            : this.xTargetAlignToSide,
         xAlignSide: this._currentXAlignSide
            ? this._currentXAlignSide
            : this.xAlignSide,
      };
   }

   private getVAlignSides(): VAlignSides {
      return {
         yTargetAlignToSide: this.currentYTargetAlignToSide
            ? this.currentYTargetAlignToSide
            : this.yTargetAlignToSide,
         yAlignSide: this._currentYAlignSide
            ? this._currentYAlignSide
            : this.yAlignSide,
      };
   }
}
