
import { DomElement } from '../dom-element/dom-element';
import { IDomWindow } from '../dom-window';
import { IPoint } from '../geometry/point.interface';
import { ISvgDomElement } from './svg-dom-element.interface';

export class SvgDomElement
   extends DomElement<SVGSVGElement>
   implements ISvgDomElement
{
   constructor(window: IDomWindow, element: SVGSVGElement) {
      super(window, element);
   }

   public transformToSvgCoordinates(
      domPoints: IPoint[],
      offsetX: number,
      offsetY: number
   ): IPoint[] {
      const svgPoints: IPoint[] = [];
      const svg = this._element;
      const transformationMatrix = svg.getScreenCTM()?.inverse();
      domPoints.forEach((p: IPoint) => {
         let svgPoint = svg.createSVGPoint();
         svgPoint.x = p.x + offsetX;
         svgPoint.y = p.y + offsetY;

         svgPoint = svgPoint.matrixTransform(transformationMatrix);
         svgPoints.push({ x: svgPoint.x, y: svgPoint.y });
      });
      return svgPoints;
   }
}
