import Link from 'next/link';

type DocsBreadcrumbItem = {
  label: string;
  href?: string;
};

type DocsBreadcrumbsProps = {
  items: DocsBreadcrumbItem[];
};

export function DocsBreadcrumbs({ items }: DocsBreadcrumbsProps) {
  return (
    <nav className="docsApiBreadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span aria-hidden="true"> / </span>}
          {item.href ? (
            <Link href={item.href} scroll={false}>
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
