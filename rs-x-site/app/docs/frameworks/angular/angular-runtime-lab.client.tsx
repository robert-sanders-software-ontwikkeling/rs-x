'use client';

import {
  EditableCompiledFrameworkExample,
  FrameworkRuntimeLab,
} from '@rs-x/react-components';

const loadAngularCoreModule = () => import('@angular/core');
const loadAngularCommonModule = () => import('@angular/common');
const loadAngularFormsModule = () => import('@angular/forms');
const loadAngularPlatformBrowserModule = () => import('@angular/platform-browser');
const loadAngularCompilerModule = () => import('@angular/compiler');
const loadAngularRsxModule = () =>
  import('../../../../../rs-x-angular/dist/rsx/fesm2022/rs-x-angular.mjs');
const loadRxjsModule = () => import('rxjs');

export function AngularRuntimeLab() {
  return (
    <FrameworkRuntimeLab
      defaultFramework="angular"
      frameworks={['angular']}
      moduleLoaders={{
        loadAngularCoreModule,
        loadAngularCommonModule,
        loadAngularFormsModule,
        loadAngularPlatformBrowserModule,
        loadAngularCompilerModule,
        loadAngularRsxModule,
        loadRxjsModule,
      }}
    />
  );
}

export function AngularCompiledFrameworkExample({
  initialCode,
  editorId,
}: {
  initialCode: string;
  editorId: string;
}) {
  return (
    <EditableCompiledFrameworkExample
      framework="angular"
      initialCode={initialCode}
      editorId={editorId}
      moduleLoaders={{
        loadAngularCoreModule,
        loadAngularCommonModule,
        loadAngularFormsModule,
        loadAngularPlatformBrowserModule,
        loadAngularCompilerModule,
        loadAngularRsxModule,
        loadRxjsModule,
      }}
    />
  );
}
