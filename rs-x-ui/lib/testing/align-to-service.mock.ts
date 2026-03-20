import { IAlignToService } from '../align-to/align-to-service.interface';
import { HAlignSide } from '../align-to/halign-side.enum';
import { VAlignSide } from '../align-to/valign-side.enum';
import { IDomElement } from '../dom-element';
import { DomElementMock } from './dom-element.mock';

export class AlignToServiceMock implements IAlignToService {
   public target?: IDomElement<HTMLElement> | undefined;
   public xAlignTarget?: DomElementMock| undefined;
   public yAlignTarget?: DomElementMock| undefined;
   public alignWidth!: boolean;
   public allowFlip!: boolean;
   public alignedToTop!: boolean;
   public xTargetAlignToSide!: HAlignSide;
   public yTargetAlignToSide!: VAlignSide;
   public xAlignSide!: HAlignSide;
   public yAlignSide!: VAlignSide;
   public offset!: number;
   public currentXTargetAlignToSide!: HAlignSide;
   public currentYTargetAlignToSide!: VAlignSide;
   public currentXAlignSide!: HAlignSide;
   public currentYAlignSide!: VAlignSide;


   public readonly updatePosition = jest.fn();
}
