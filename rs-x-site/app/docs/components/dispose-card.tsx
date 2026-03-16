import React from 'react';
import { Card } from './card';


export const DisposeCard: React.FC = () => {
    return (
        <Card id="dispose-lifecycle" header='Lifecycle'>
            This class exposes <span className="codeInline">dispose()</span>.
            Always call <span className="codeInline">dispose()</span> when you
            are finished using an instance, to release resources and prevent
            memory leaks.
        </Card>
        
    );
};