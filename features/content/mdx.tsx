import 'server-only';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { MDXRemote } from 'next-mdx-remote-client/rsc';
import type { MDXRemoteOptions } from 'next-mdx-remote-client/rsc';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';

import { slugifyHeading } from './headings';

function childrenText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    const props = children.props as { children?: ReactNode };
    return childrenText(props.children);
  }
  return '';
}

function MdxHeading({
  level,
  children,
  ...props
}: ComponentPropsWithoutRef<'h2'> & { level: 2 | 3 }) {
  const text = childrenText(children);
  const id = slugifyHeading(text);
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag id={id} {...props}>
      {children}
    </Tag>
  );
}

const components = {
  h2: (props: ComponentPropsWithoutRef<'h2'>) => <MdxHeading level={2} {...props} />,
  h3: (props: ComponentPropsWithoutRef<'h3'>) => <MdxHeading level={3} {...props} />,
  a: ({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) => {
    const external = href?.startsWith('http://') || href?.startsWith('https://');
    return (
      <a href={href} rel={external ? 'noopener noreferrer' : undefined} {...props}>
        {children}
      </a>
    );
  },
};

const options: MDXRemoteOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [[rehypePrettyCode, { theme: 'vesper', keepBackground: false }]],
  },
};

export function MdxContent({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} options={options} />;
}
