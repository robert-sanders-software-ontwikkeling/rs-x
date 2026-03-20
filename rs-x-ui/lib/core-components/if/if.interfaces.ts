import { ICustomElementController } from '../../web-component/interfaces';

export interface IIfController extends ICustomElementController {
   show: boolean;
}

export interface IIfDirective {
   show: boolean;
}
