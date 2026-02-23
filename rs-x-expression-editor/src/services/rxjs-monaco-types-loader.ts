import { type Monaco } from '@monaco-editor/react';

import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

type Manifest = {
  files: string[];
};

export class RxjsMonacoTypesLoader {
  private static _instance: RxjsMonacoTypesLoader | null = null;
  private _installed = false;

  private constructor() {}

  public static getInstance(): RxjsMonacoTypesLoader {
    if (!this._instance) {
      this._instance = new RxjsMonacoTypesLoader();
    }
    return this._instance;
  }

  public async install(monaco: Monaco): Promise<void> {
    if (this._installed) return;

    const ts = monaco.typescript;
    if (!ts) return;

    ts.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      baseUrl: 'file:///',

      paths: {
        rxjs: ['node_modules/rxjs/dist/types/index.d.ts'],
        'rxjs/*': ['node_modules/rxjs/dist/types/*'],

        // If you use operators via 'rxjs/operators':
        'rxjs/operators': ['node_modules/rxjs/dist/types/operators/index.d.ts'],
        'rxjs/operators/*': ['node_modules/rxjs/dist/types/operators/*'],
      },

      typeRoots: ['node_modules/@types'],
    });

    const res = await fetch('/monaco-dts/manifest.json');
    const manifest = (await res.json()) as Manifest;

    for (const webPath of manifest.files) {
      const fileRes = await fetch(webPath);
      const content = await fileRes.text();
      const rel = webPath.replace('/monaco-dts/node_modules/', '');
      const uri = `file:///node_modules/${rel}`;
      ts.typescriptDefaults.addExtraLib(content, uri);
    }

    const globalLib = `
            import * as Core from 'rxjs';
            import * as Ops from 'rxjs/operators';

            declare global {
                namespace rxjs {
                    export const audit: typeof Ops.audit;
                    export const auditTime: typeof Ops.auditTime;
                    export const buffer: typeof Ops.buffer;
                    export const bufferCount: typeof Ops.bufferCount;
                    export const bufferTime: typeof Ops.bufferTime;
                    export const bufferToggle: typeof Ops.bufferToggle;
                    export const bufferWhen: typeof Ops.bufferWhen;
                    export const catchError: typeof Ops.catchError;
                    export const combineAll: typeof Ops.combineAll;
                    export const combineLatestAll: typeof Ops.combineLatestAll;
                    export const combineLatestWith: typeof Ops.combineLatestWith;
                    export const concatAll: typeof Ops.concatAll;
                    export const concatMap: typeof Ops.concatMap;
                    export const concatMapTo: typeof Ops.concatMapTo;
                    export const concatWith: typeof Ops.concatWith;
                    export const connect: typeof Ops.connect;
                    export const count: typeof Ops.count;
                    export const debounce: typeof Ops.debounce;
                    export const debounceTime: typeof Ops.debounceTime;
                    export const defaultIfEmpty: typeof Ops.defaultIfEmpty;
                    export const delay: typeof Ops.delay;
                    export const delayWhen: typeof Ops.delayWhen;
                    export const dematerialize: typeof Ops.dematerialize;
                    export const distinct: typeof Ops.distinct;
                    export const distinctUntilChanged: typeof Ops.distinctUntilChanged;
                    export const distinctUntilKeyChanged: typeof Ops.distinctUntilKeyChanged;
                    export const elementAt: typeof Ops.elementAt;
                    export const endWith: typeof Ops.endWith;
                    export const every: typeof Ops.every;
                    export const exhaust: typeof Ops.exhaust;
                    export const exhaustAll: typeof Ops.exhaustAll;
                    export const exhaustMap: typeof Ops.exhaustMap;
                    export const expand: typeof Ops.expand;
                    export const filter: typeof Ops.filter;
                    export const finalize: typeof Ops.finalize;
                    export const find: typeof Ops.find;
                    export const findIndex: typeof Ops.findIndex;
                    export const first: typeof Ops.first;
                    export const groupBy: typeof Ops.groupBy;
                    export const ignoreElements: typeof Ops.ignoreElements;
                    export const isEmpty: typeof Ops.isEmpty;
                    export const last: typeof Ops.last;
                    export const map: typeof Ops.map;
                    export const mapTo: typeof Ops.mapTo;
                    export const materialize: typeof Ops.materialize;
                    export const max: typeof Ops.max;
                    export const mergeAll: typeof Ops.mergeAll;
                    export const mergeMap: typeof Ops.mergeMap;
                    export const mergeMapTo: typeof Ops.mergeMapTo;
                    export const mergeScan: typeof Ops.mergeScan;
                    export const mergeWith: typeof Ops.mergeWith;
                    export const min: typeof Ops.min;
                    export const multicast: typeof Ops.multicast;
                    export const observeOn: typeof Ops.observeOn;
                    export const onErrorResumeNextWith: typeof Ops.onErrorResumeNextWith;
                    export const pairwise: typeof Ops.pairwise;
                    export const partition: typeof Ops.partition;
                    export const pluck: typeof Ops.pluck;
                    export const publish: typeof Ops.publish;
                    export const publishBehavior: typeof Ops.publishBehavior;
                    export const publishLast: typeof Ops.publishLast;
                    export const publishReplay: typeof Ops.publishReplay;
                    export const raceWith: typeof Ops.raceWith;
                    export const reduce: typeof Ops.reduce;
                    export const repeat: typeof Ops.repeat;
                    export const repeatWhen: typeof Ops.repeatWhen;
                    export const retry: typeof Ops.retry;
                    export const retryWhen: typeof Ops.retryWhen;
                    export const refCount: typeof Ops.refCount;
                    export const sample: typeof Ops.sample;
                    export const sampleTime: typeof Ops.sampleTime;
                    export const scan: typeof Ops.scan;
                    export const sequenceEqual: typeof Ops.sequenceEqual;
                    export const share: typeof Ops.share;
                    export const shareReplay: typeof Ops.shareReplay;
                    export const single: typeof Ops.single;
                    export const skip: typeof Ops.skip;
                    export const skipLast: typeof Ops.skipLast;
                    export const skipUntil: typeof Ops.skipUntil;
                    export const skipWhile: typeof Ops.skipWhile;
                    export const startWith: typeof Ops.startWith;
                    export const subscribeOn: typeof Ops.subscribeOn;
                    export const switchAll: typeof Ops.switchAll;
                    export const switchMap: typeof Ops.switchMap;
                    export const switchMapTo: typeof Ops.switchMapTo;
                    export const switchScan: typeof Ops.switchScan;
                    export const take: typeof Ops.take;
                    export const takeLast: typeof Ops.takeLast;
                    export const takeUntil: typeof Ops.takeUntil;
                    export const takeWhile: typeof Ops.takeWhile;
                    export const tap: typeof Ops.tap;
                    export const throttle: typeof Ops.throttle;
                    export const throttleTime: typeof Ops.throttleTime;
                    export const throwIfEmpty: typeof Ops.throwIfEmpty;
                    export const timeInterval: typeof Ops.timeInterval;
                    export const timeout: typeof Ops.timeout;
                    export const timeoutWith: typeof Ops.timeoutWith;
                    export const timestamp: typeof Ops.timestamp;
                    export const toArray: typeof Ops.toArray;
                    export const window: typeof Ops.window;
                    export const windowCount: typeof Ops.windowCount;
                    export const windowTime: typeof Ops.windowTime;
                    export const windowToggle: typeof Ops.windowToggle;
                    export const windowWhen: typeof Ops.windowWhen;
                    export const withLatestFrom: typeof Ops.withLatestFrom;
                    export const zipAll: typeof Ops.zipAll;
                    export const zipWith: typeof Ops.zipWith;
                }
                const rxjs: typeof rxjs;
            }

            export {};
        `;

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      globalLib,
      'file:///globals/rxjs-global.d.ts',
    );

    // const libs = ts.typescriptDefaults.getExtraLibs();
    // console.log('extraLib count:', Object.keys(libs).length);

    // // check a few
    // console.log(JSON.stringify(libs));

    // // check a specific one you expect
    // console.log('has rxjs ajax d.ts?', Boolean(libs['file:///node_modules/rxjs/dist/types/ajax/index.d.ts']));

    this._installed = true;
  }
}
