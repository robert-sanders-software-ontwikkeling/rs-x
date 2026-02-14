import React, { useEffect, useState } from 'react';
import prettier from 'prettier/standalone';
import babel from 'prettier/plugins/babel';
import estree from 'prettier/plugins/estree';

import './object-viewer.component.css';

interface ObjectViewerProps {
    modelString: string | undefined;
}

export const ObjectViewer: React.FC<ObjectViewerProps> = ({ modelString }) => {
    const [formatted, setFormatted] = useState('');

    const highlight = (code: string) => {
        return code
            // single quoted strings
            .replace(/'(.*?)'/g, "<span class='token-string'>'$1'</span>")
            // double quoted strings (fallback)
            .replace(/"(.*?)"/g, "<span class='token-string'>\"$1\"</span>")
            // numbers
            .replace(/\b\d+\b/g, "<span class='token-number'>$&</span>")
            // booleans
            .replace(/\b(true|false)\b/g, "<span class='token-boolean'>$1</span>")
            // null
            .replace(/\bnull\b/g, "<span class='token-null'>null</span>")
            // keyword new
            .replace(/\bnew\b/g, "<span class='token-keyword'>new</span>")
            // punctuation
            .replace(/([{}[\]:,])/g, "<span class='token-punctuation'>$1</span>")
            // object keys
            .replace(
                /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
                "<span class='token-key'>$1</span>:"
            );
    };

    const stripOuterParens = (input: string): string => {
        let s = input.trim();

        s = s.replace(/;+\s*$/, '').trim();
        while (s.startsWith('(') && s.endsWith(')')) {
            s = s.slice(1, -1).trim();
            s = s.replace(/;+\s*$/, '').trim();
        }

        return s;
    };

    const formatCode = async (code: string): Promise<string> => {
        try {
            const cleaned = code.trim();
            const wrapped = cleaned.startsWith('{') ? `(${cleaned})` : cleaned;

            const pretty = await prettier.format(wrapped, {
                parser: 'babel',
                plugins: [babel, estree],
                singleQuote: true,
                trailingComma: 'none',
                tabWidth: 2,
                useTabs: false,
            });

            return stripOuterParens(pretty).trim();
        } catch (e) {
            return code.replace(/\t/g, '  ').trim();
        }
    };

    useEffect(() => {
        let active = true;

        const run = async () => {
            if (!modelString) {
                if (active) setFormatted('');
                return;
            }
            const pretty = await formatCode(modelString);
            if (active) setFormatted(pretty);
        };

        run();
        return () => {
            active = false;
        };
    }, [modelString]);

    return (
        <pre
            className="js-object-view"
            dangerouslySetInnerHTML={{ __html: highlight(formatted) }}
        />
    );
};