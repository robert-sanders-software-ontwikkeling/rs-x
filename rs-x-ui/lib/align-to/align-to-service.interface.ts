import { IDomElement } from '../dom-element/dom-element.interface';
import { HAlignSide } from './halign-side.enum';
import { VAlignSide } from './valign-side.enum';

export interface IAlignToService {
   target?: IDomElement;
   xAlignTarget?: IDomElement;
   yAlignTarget?: IDomElement;
   alignWidth: boolean;
   allowFlip: boolean;
   alignedToTop: boolean;
   xTargetAlignToSide: HAlignSide;
   yTargetAlignToSide: VAlignSide;
   xAlignSide: HAlignSide;
   yAlignSide: VAlignSide;
   offset: number;
   readonly currentXTargetAlignToSide: HAlignSide;
   readonly currentYTargetAlignToSide: VAlignSide;
   readonly currentXAlignSide: HAlignSide;
   readonly currentYAlignSide: VAlignSide;

   updatePosition(): void;
}
