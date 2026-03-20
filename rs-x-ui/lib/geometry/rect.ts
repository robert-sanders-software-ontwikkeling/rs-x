import { ArgumentException, Type } from '@rs-x/core';
import { IRect } from './rect.interface';


export class Rect implements IRect {
   public static empty = new Rect();
   private _left!: number;
   private _top!: number;
   private _width!: number;
   private _height!: number;

   constructor(init?: Partial<IRect>) {
      Object.assign(this, init);
   }

   public get left(): number {
      if (Type.isEmpty(this._left)) {
         this._left = 0;
      }
      return this._left;
   }

   public set left(value: number) {
      this._left = value;
   }

   public get top(): number {
      if (Type.isEmpty(this._top)) {
         this._top = 0;
      }
      return this._top;
   }

   public set top(value: number) {
      this._top = value;
   }

   public get width(): number {
      if (Type.isEmpty(this._width)) {
         this._width = 0;
      }
      return this._width;
   }

   public set width(value: number) {
      if (value < 0) {
         throw new ArgumentException(
            `width must equal or greater than 0 (width = ${value}`
         );
      }
      this._width = value;
   }

   public get height(): number {
      if (Type.isEmpty(this._height)) {
         this._height = 0;
      }
      return this._height;
   }

   public set height(value: number) {
      if (value < 0) {
         throw new ArgumentException(
            `height must equal or greater than 0 (height = ${value}`
         );
      }
      this._height = value;
   }

   public get centerX(): number {
      return this.left + this.width / 2;
   }

   public get centerY(): number {
      return this.top + this.height / 2;
   }

   public get right(): number {
      return this.left + this.width;
   }

   public get bottom(): number {
      return this.top + this.height;
   }

   public get isEmpty(): boolean {
      return this.width === 0 || this.height === 0;
   }

   public clone(): Rect {
      return new Rect({
         height: this._height,
         left: this._left,
         top: this._top,
         width: this._width,
      });
   }

   public isPointInside(x: number, y: number): boolean {
      return x > this.left && x < this.right && y > this.top && y < this.bottom;
   }

   public join(rect: Rect): Rect {
      if (this.isEmpty) {
         return rect.clone();
      } else if (rect.isEmpty) {
         return this.clone();
      } else {
         const left = Math.min(this.left, rect.left);
         const top = Math.min(this.top, rect.top);
         const right = Math.max(this.right, rect.right);
         const bottom = Math.max(this.bottom, rect.bottom);
         return new Rect({
            left,
            top,
            width: right - left,
            height: bottom - top,
         });
      }
   }

   public equals(rect: Rect): boolean {
      if (!rect) {
         return false;
      }
      return (
         this.left === rect.left &&
         this.top === rect.top &&
         this.width === rect.width &&
         this.height === rect.height
      );
   }
}
