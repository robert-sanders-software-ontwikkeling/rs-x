import React, { ReactNode } from 'react';
import { DocsBreadcrumbs, DocsBreadcrumbItem } from '../../../components/DocsBreadcrumbs';


export interface IApiDocHeaderProps {
    breadcrumb: DocsBreadcrumbItem[];
    name: string;
    type?: string;
    whatItDoes: ReactNode
    eyebrow?: string;
}


export const ApiDocHeader: React.FC<IApiDocHeaderProps> = ({ breadcrumb, name, type, whatItDoes, eyebrow }) => {

    return (
        <div className="docsApiHeader">
            <div>
                <DocsBreadcrumbs
                    items={breadcrumb}
                />
                {!!eyebrow?.length &&
                    <p className="docsApiEyebrow">{eyebrow}</p>
                }
                <h1 className="sectionTitle docsApiTitle">
                    <span>{name}</span>
                    {type && <span className="docsApiTypeBadge">{type}</span>}
                </h1>
                <p className="sectionLead docsApiLead">
                    {whatItDoes}
                </p>
            </div>
        </div>
    );

};