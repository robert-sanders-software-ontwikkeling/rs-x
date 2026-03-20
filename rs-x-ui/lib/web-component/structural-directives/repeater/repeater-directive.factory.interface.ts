import { IStructuralDirective } from './repeater.directive.interface';

export interface IStructuralDirectiveFactory {
   create(element: Element, expression: string): IStructuralDirective;
}
