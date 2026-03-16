import React from 'react';
import { IQuickFact } from './api-member';

export interface IQuickFactsProps {
    items: IQuickFact[]
}

export const QuickFacts: React.FC<IQuickFactsProps> = ({ items }) => {
    return (
        <div className="docsApiSidebarSection">
            <div className="docsApiSidebarTitle">Quick facts</div>
            <dl className="docsApiFacts">
                {
                    items.map(item => (
                        <div key={item.label} className="docsApiFact">
                            <dt>{item.label}</dt>
                            <dd>{item.fact}</dd>
                        </div>
                    ))
                }
            </dl>
        </div>
    );
};