'use client';

import {
  EditableCompiledFrameworkExample,
  FrameworkRuntimeLab,
} from '@rs-x/react-components';

const loadVueModule = () => import('vue/dist/vue.esm-bundler.js');
const loadRsxVueModule = () => import('@rs-x/vue');

export function VueRuntimeLab() {
  return (
    <FrameworkRuntimeLab
      defaultFramework="vue"
      frameworks={['vue']}
      moduleLoaders={{ loadVueModule, loadRsxVueModule }}
    />
  );
}

export function VueCompiledFrameworkExample({
  initialCode,
  editorId,
}: {
  initialCode: string;
  editorId: string;
}) {
  return (
    <EditableCompiledFrameworkExample
      framework="vue"
      initialCode={initialCode}
      editorId={editorId}
      moduleLoaders={{ loadVueModule, loadRsxVueModule }}
    />
  );
}
