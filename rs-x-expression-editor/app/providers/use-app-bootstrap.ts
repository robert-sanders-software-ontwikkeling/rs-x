'use client';

import { useEffect, useRef, useState } from 'react';

import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            await InjectionContainer.load(RsXExpressionParserModule);

            const host = globalThis as unknown as MonacoEnvironmentHost;

            host.MonacoEnvironment = {
                getWorker(_moduleId: string, label: string) {
                    if (label === 'typescript' || label === 'javascript') {
                        return new Worker(
                            new URL(
                                'monaco-editor/esm/vs/language/typescript/ts.worker',
                                import.meta.url,
                            ),
                            { type: 'module' },
                        );
                    }

                    return new Worker(
                        new URL(
                            'monaco-editor/esm/vs/editor/editor.worker',
                            import.meta.url,
                        ),
                        { type: 'module' },
                    );
                },
            };
        })();
    }

    return bootstrapPromise;
}

export function useAppBootstrap(): { isReady: boolean } {
    const [isReady, setIsReady] = useState<boolean>(false);
    const didRunRef = useRef<boolean>(false);

    useEffect(() => {
        if (didRunRef.current) {
            return;
        }
        didRunRef.current = true;

        bootstrap()
            .then(() => setIsReady(true))
            .catch((e) => {
                console.error('App bootstrap failed', e);
            });
    }, []);

    return { isReady };
}