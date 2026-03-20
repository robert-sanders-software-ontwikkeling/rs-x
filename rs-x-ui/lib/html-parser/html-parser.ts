import { Injectable, Type } from '@rs-x/core';
import { IHTMLParser } from './html-parser.interface';
import { InvalidHtmlException } from './invalid-html.exception';

@Injectable()
export class HTMLParser implements IHTMLParser {
   private readonly _templateCache = new Map<string, Node[]>();

   public parse(html: string): Node[] {
      if (!Type.isEmpty(html)) {
         let nodes = this._templateCache.get(html);

         if (!nodes) {
            if (__DEV__) {
               this.validateHTML(html);
            }
            const document = new DOMParser().parseFromString(html, 'text/html');

            nodes = Array.from(document.body.childNodes);
            this._templateCache.set(html, nodes);
         }
         return nodes.map((node) => node.cloneNode(true));
      } else {
         return [];
      }
   }

   private validateHTML(html: string): void {
      const wrappedHtml = `<template>${html}</template>`;
      const errors = Array.from(
         new DOMParser()
            .parseFromString(wrappedHtml, 'application/xhtml+xml')
            .getElementsByTagName('parsererror')
      );

      if (errors.length === 0) {
         return;
      }
      const errorMessage = errors.map((error) => error.textContent).join(' ');
      throw new InvalidHtmlException(wrappedHtml, errorMessage);
   }
}
