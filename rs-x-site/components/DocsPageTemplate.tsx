import type { ReactNode } from 'react';

type DocsPageTemplateProps = {
  children: ReactNode;
};

export function DocsPageTemplate({ children }: DocsPageTemplateProps) {
  return (
    <main id="content" className="main docsMain">
      <section className="section docsApiSection">
        <div className="container docsPageContainer">
          <div className="docsPageShell">{children}</div>
        </div>
      </section>
    </main>
  );
}
