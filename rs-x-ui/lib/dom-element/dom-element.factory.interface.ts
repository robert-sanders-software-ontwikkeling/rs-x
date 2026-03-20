import { HtmlTagName } from '../html-elements/html-tag-name';


export interface IDomElementFactory {
   createElement<T extends HTMLElement>(tagName: HtmlTagName): T;
}
