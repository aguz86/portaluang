import React from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { sanitizeHtml, isSafeUrl } from '../utils/security';

interface SafeMarkdownProps {
  children: string;
  className?: string;
}

const slugifyHeading = (text: string): string =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const extractTextFromReactNode = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join('');
  if (React.isValidElement(node) && (node.props as any)?.children) {
    return extractTextFromReactNode((node.props as any).children);
  }
  return '';
};

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ children, className }) => {
  const cleanContent = sanitizeHtml(children || '');

  return (
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children: hChildren, ...props }) => {
            const id = slugifyHeading(extractTextFromReactNode(hChildren));
            return (
              <h1 id={id || undefined} className="scroll-mt-24" {...props}>
                {hChildren}
              </h1>
            );
          },
          h2: ({ children: hChildren, ...props }) => {
            const id = slugifyHeading(extractTextFromReactNode(hChildren));
            return (
              <h2 id={id || undefined} className="scroll-mt-24" {...props}>
                {hChildren}
              </h2>
            );
          },
          h3: ({ children: hChildren, ...props }) => {
            const id = slugifyHeading(extractTextFromReactNode(hChildren));
            return (
              <h3 id={id || undefined} className="scroll-mt-24" {...props}>
                {hChildren}
              </h3>
            );
          },
          a: ({ href, children: aChildren, ...props }) => {
            const safe = isSafeUrl(href);
            if (!safe || !href) {
              return <span className="underline decoration-dotted text-stone-400">{aChildren}</span>;
            }

            const isExternal = href.startsWith('http://') || href.startsWith('https://');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer nofollow' : undefined}
                className="text-amber-500 hover:text-amber-400 hover:underline transition-colors"
                {...props}
              >
                {aChildren}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            if (!isSafeUrl(src)) {
              return null;
            }
            return (
              <img
                src={src}
                alt={alt || 'Image'}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="rounded-xl border border-stone-800 my-4 max-w-full h-auto"
                {...props}
              />
            );
          },
          table: ({ children: tChildren }) => (
            <div className="overflow-x-auto my-5 rounded-xl border border-stone-800">
              <table className="min-w-full divide-y divide-stone-800 text-sm">{tChildren}</table>
            </div>
          ),
          th: ({ children: thChildren }) => (
            <th className="bg-stone-900 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-stone-300">
              {thChildren}
            </th>
          ),
          td: ({ children: tdChildren }) => (
            <td className="px-4 py-2.5 border-t border-stone-800/70 text-stone-300">{tdChildren}</td>
          ),
          blockquote: ({ children: bChildren }) => (
            <blockquote className="border-l-4 border-amber-500/70 bg-stone-900/70 pl-4 pr-3 py-2 rounded-r-xl my-4 text-stone-300 italic">
              {bChildren}
            </blockquote>
          ),
          iframe: () => null,
          script: () => null,
          object: () => null,
          embed: () => null,
        }}
      >
        {cleanContent}
      </Markdown>
    </div>
  );
};
