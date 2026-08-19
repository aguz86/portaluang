import React from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { sanitizeHtml, isSafeUrl } from '../utils/security';

interface SafeMarkdownProps {
  children: string;
  className?: string;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ children, className }) => {
  // 1. Sanitize the markdown / HTML text string to strip out scripts, iframes, onerror, etc.
  const cleanContent = sanitizeHtml(children || '');

  return (
    <div className={className}>
      <Markdown
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node, href, children, ...props }) => {
            const safe = isSafeUrl(href);
            if (!safe || !href) {
              return <span className="underline decoration-dotted text-stone-400">{children}</span>;
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
                {children}
              </a>
            );
          },
          img: ({ node, src, alt, ...props }) => {
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
          iframe: () => null, // Strictly disallow any iframe injection in markdown
          script: () => null, // Strictly disallow script tag execution
          object: () => null,
          embed: () => null
        }}
      >
        {cleanContent}
      </Markdown>
    </div>
  );
};
