import { ICustomElementController } from '../../web-component/interfaces';

export interface IStaticHtmlController extends ICustomElementController {
   html: string;
}

export interface IStaticHtmlDirective {
   html: string;
}
