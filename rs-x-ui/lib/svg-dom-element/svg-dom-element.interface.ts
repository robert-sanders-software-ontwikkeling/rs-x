
import { IDomElement } from '../dom-element/dom-element.interface';
import { IPoint } from '../geometry/point.interface';


export interface ISvgDomElement extends IDomElement<SVGSVGElement> {
   transformToSvgCoordinates(
      points: IPoint[],
      offsetX: number,
      offsetY: number
   ): IPoint[];
}
