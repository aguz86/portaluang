import crypto from 'crypto';

export interface PayloadEnvConfig {
  url: string;
  apiKey: string;
  webhookSecret: string;
  configured: boolean;
}

export interface PayloadCmsSettings {
  syncMode: 'hybrid' | 'payload_priority' | 'local';
  autoSyncOnWebhook: boolean;
  postsCollection: string;
  pagesCollection: string;
  guidesCollection: string;
}

export const DEFAULT_CMS_SETTINGS: PayloadCmsSettings = {
  syncMode: 'hybrid',
  autoSyncOnWebhook: true,
  postsCollection: 'posts',
  pagesCollection: 'pages',
  guidesCollection: 'guides',
};

export interface PayloadSyncCache {
  lastSyncedAt: string;
  posts: any[];
  pages: Record<string, { title: string; content: string; updatedAt?: string; seoTitle?: string; seoDescription?: string; source: 'payload' }>;
  guides: any[];
  stats: {
    postsCount: number;
    pagesCount: number;
    guidesCount: number;
  };
}

export const isSafeExternalUrl = (rawUrl: string | undefined | null): boolean => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    // Block cloud metadata IP
    if (host === '169.254.169.254' || host === 'metadata.google.internal') return false;
    return true;
  } catch {
    return false;
  }
};

export const getPayloadConfig = (): PayloadEnvConfig => {
  const rawUrl = (process.env.PAYLOAD_CMS_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (process.env.PAYLOAD_CMS_API_KEY || '').trim();
  const webhookSecret = (process.env.PAYLOAD_WEBHOOK_SECRET || '').trim();
  const validUrl = rawUrl && isSafeExternalUrl(rawUrl) && /^https?:\/\//i.test(rawUrl) ? rawUrl : '';
  return {
    url: validUrl,
    apiKey,
    webhookSecret,
    configured: Boolean(validUrl),
  };
};

export const maskPayloadUrl = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
};

const resolveMediaUrl = (baseUrl: string, mediaField: any): string => {
  if (!mediaField) return '';
  const candidate = typeof mediaField === 'string' ? mediaField : mediaField.url || mediaField.thumbnailURL || '';
  if (!candidate) return '';
  if (candidate.startsWith('/') && !candidate.startsWith('//') && baseUrl) {
    const full = `${baseUrl}${candidate}`;
    return isSafeExternalUrl(full) ? full : '';
  }
  return isSafeExternalUrl(candidate) ? candidate : '';
};

const formatLexicalLeaf = (node: any): string => {
  let text = String(node.text || '');
  if (!text) return '';
  const fmt = typeof node.format === 'number' ? node.format : 0;
  // Lexical format bitmask: 1=bold, 2=italic, 4=strikethrough, 8=underline, 16=code
  if (fmt & 16) return `\`${text}\``;
  if (fmt & 1) text = `**${text}**`;
  if (fmt & 2) text = `_${text}_`;
  if (fmt & 4) text = `~~${text}~~`;
  return text;
};

const serializeLexicalChildren = (children: any[], baseUrl: string): string => {
  if (!Array.isArray(children)) return '';
  return children
    .map((child) => {
      if (!child || typeof child !== 'object') return '';
      if (child.type === 'text') return formatLexicalLeaf(child);
      if (child.type === 'linebreak') return '  \n';
      if (child.type === 'tab') return '  ';
      if (child.type === 'link' || child.type === 'autolink') {
        const href = child.fields?.url || child.url || '';
        const inner = serializeLexicalChildren(child.children || [], baseUrl) || href;
        if (isSafeExternalUrl(href)) {
          return `[${inner}](${href})`;
        }
        return inner;
      }
      if (Array.isArray(child.children)) {
        return serializeLexicalChildren(child.children, baseUrl);
      }
      return '';
    })
    .join('');
};

const serializeLexicalBlocks = (nodes: any[], baseUrl: string, listDepth = 0): string => {
  if (!Array.isArray(nodes)) return '';
  const blocks: string[] = [];

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    switch (node.type) {
      case 'heading': {
        const tag = String(node.tag || 'h2');
        const level = Math.min(6, Math.max(1, parseInt(tag.replace(/[^0-9]/g, ''), 10) || 2));
        const inner = serializeLexicalChildren(node.children || [], baseUrl).trim();
        if (inner) blocks.push(`${'#'.repeat(level)} ${inner}`);
        break;
      }
      case 'paragraph': {
        const inner = serializeLexicalChildren(node.children || [], baseUrl).trim();
        if (inner) blocks.push(inner);
        break;
      }
      case 'quote': {
        const inner = serializeLexicalChildren(node.children || [], baseUrl).trim();
        if (inner) {
          blocks.push(
            inner
              .split('\n')
              .map((line) => `> ${line}`)
              .join('\n')
          );
        }
        break;
      }
      case 'code': {
        const lang = String(node.language || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const codeText = serializeLexicalChildren(node.children || [], baseUrl);
        blocks.push(`\`\`\`${lang}\n${codeText}\n\`\`\``);
        break;
      }
      case 'list': {
        const isOrdered = node.listType === 'number' || node.tag === 'ol';
        const isCheck = node.listType === 'check';
        const indent = '  '.repeat(listDepth);
        const items = Array.isArray(node.children) ? node.children : [];
        const lines: string[] = [];
        items.forEach((item: any, idx: number) => {
          const itemChildren = Array.isArray(item.children) ? item.children : [];
          const nestedLists = itemChildren.filter((c: any) => c?.type === 'list');
          const inlineNodes = itemChildren.filter((c: any) => c?.type !== 'list');
          const text = serializeLexicalChildren(inlineNodes, baseUrl).trim();
          const prefix = isCheck
            ? `- [${item.checked ? 'x' : ' '}] `
            : isOrdered
            ? `${idx + 1}. `
            : '- ';
          if (text) lines.push(`${indent}${prefix}${text}`);
          if (nestedLists.length > 0) {
            lines.push(serializeLexicalBlocks(nestedLists, baseUrl, listDepth + 1));
          }
        });
        if (lines.length > 0) blocks.push(lines.join('\n'));
        break;
      }
      case 'horizontalrule': {
        blocks.push('---');
        break;
      }
      case 'upload': {
        const imgUrl = resolveMediaUrl(baseUrl, node.value);
        const alt = String(node.value?.alt || node.value?.filename || 'Gambar').replace(/[\[\]]/g, '');
        if (imgUrl) {
          blocks.push(`![${alt}](${imgUrl})`);
        }
        break;
      }
      case 'table': {
        const rows = Array.isArray(node.children) ? node.children : [];
        const tableLines: string[] = [];
        rows.forEach((row: any, rowIdx: number) => {
          const cells = Array.isArray(row.children) ? row.children : [];
          const rowText = cells
            .map((cell: any) =>
              serializeLexicalBlocks(cell.children || [], baseUrl).replace(/\n+/g, ' ').trim() || ' '
            )
            .join(' | ');
          tableLines.push(`| ${rowText} |`);
          if (rowIdx === 0 && cells.length > 0) {
            tableLines.push(`| ${cells.map(() => '---').join(' | ')} |`);
          }
        });
        if (tableLines.length > 0) blocks.push(tableLines.join('\n'));
        break;
      }
      default: {
        if (Array.isArray(node.children)) {
          const fallback = serializeLexicalChildren(node.children, baseUrl).trim();
          if (fallback) blocks.push(fallback);
        }
      }
    }
  }

  return blocks.join('\n\n');
};

const serializeSlateNodes = (nodes: any[], baseUrl: string): string => {
  if (!Array.isArray(nodes)) return '';
  return nodes
    .map((node) => {
      if (!node) return '';
      if (typeof node.text === 'string') {
        let t = node.text;
        if (node.code) return `\`${t}\``;
        if (node.bold) t = `**${t}**`;
        if (node.italic) t = `_${t}_`;
        if (node.strikethrough) t = `~~${t}~~`;
        return t;
      }
      const inner = serializeSlateNodes(node.children || [], baseUrl);
      switch (node.type) {
        case 'h1': return `# ${inner}`;
        case 'h2': return `## ${inner}`;
        case 'h3': return `### ${inner}`;
        case 'h4': return `#### ${inner}`;
        case 'blockquote': return `> ${inner}`;
        case 'ul': return (node.children || []).map((li: any) => `- ${serializeSlateNodes(li.children || [], baseUrl)}`).join('\n');
        case 'ol': return (node.children || []).map((li: any, i: number) => `${i + 1}. ${serializeSlateNodes(li.children || [], baseUrl)}`).join('\n');
        case 'link': return isSafeExternalUrl(node.url) ? `[${inner}](${node.url})` : inner;
        case 'upload': {
          const u = resolveMediaUrl(baseUrl, node.value);
          return u ? `![${node.value?.alt || 'Gambar'}](${u})` : '';
        }
        default: return inner;
      }
    })
    .filter(Boolean)
    .join('\n\n');
};

/**
 * Converts Payload CMS rich text (Lexical JSON, Slate JSON array, or plain Markdown/HTML string)
 * into clean Markdown ready for Portal Uang SafeMarkdown renderer.
 */
export const payloadRichTextToMarkdown = (field: any, baseUrl = ''): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (field?.root && Array.isArray(field.root.children)) {
    return serializeLexicalBlocks(field.root.children, baseUrl);
  }
  if (Array.isArray(field)) {
    return serializeSlateNodes(field, baseUrl);
  }
  return '';
};

const estimateReadTimeMinutes = (text: string): number => {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const payloadFetch = async (endpoint: string, cfg: PayloadEnvConfig): Promise<{ ok: boolean; status: number; data: any }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (cfg.apiKey) {
      headers['Authorization'] = `users API-Key ${cfg.apiKey}`;
    }
    const res = await fetch(`${cfg.url}${endpoint}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
};

export const checkPayloadHealth = async (settings: PayloadCmsSettings = DEFAULT_CMS_SETTINGS) => {
  const cfg = getPayloadConfig();
  if (!cfg.configured) {
    return {
      configured: false,
      connected: false,
      urlMasked: '',
      detail: 'PAYLOAD_CMS_URL belum diset di ENV (saat ini menggunakan CMS internal Supabase)',
      collectionsDetected: [] as string[],
    };
  }

  try {
    const candidates = [
      settings.postsCollection || 'posts',
      settings.pagesCollection || 'pages',
      settings.guidesCollection || 'guides',
    ];
    const detected: string[] = [];
    let anyReachable = false;
    let lastError = '';

    await Promise.all(
      candidates.map(async (col) => {
        try {
          const r = await payloadFetch(`/api/${encodeURIComponent(col)}?limit=1&depth=0`, cfg);
          if (r.ok && r.data && Array.isArray(r.data.docs)) {
            anyReachable = true;
            detected.push(col);
          } else if (r.status === 401 || r.status === 403) {
            lastError = 'Payload merespons 401/403 — periksa PAYLOAD_CMS_API_KEY di ENV';
          } else if (r.status === 404) {
            lastError = lastError || `Koleksi /api/${col} belum tersedia di Payload CMS`;
          }
        } catch (err: any) {
          lastError = err?.message || 'Timeout menghubungi server Payload CMS';
        }
      })
    );

    return {
      configured: true,
      connected: anyReachable,
      urlMasked: maskPayloadUrl(cfg.url),
      detail: anyReachable
        ? `Terhubung ke ${maskPayloadUrl(cfg.url)} (${detected.join(', ')})`
        : lastError || `Gagal terhubung ke ${maskPayloadUrl(cfg.url)}`,
      collectionsDetected: detected,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      urlMasked: maskPayloadUrl(cfg.url),
      detail: err?.message || 'Gagal menghubungi Payload CMS',
      collectionsDetected: [],
    };
  }
};

export const getCmsSettings = async (pool: any): Promise<PayloadCmsSettings> => {
  try {
    const res = await pool.query('SELECT data FROM app_state WHERE id = $1', ['cms_settings']);
    if (res.rows.length > 0 && res.rows[0].data) {
      return { ...DEFAULT_CMS_SETTINGS, ...res.rows[0].data };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CMS_SETTINGS;
};

export const getPayloadSyncCache = async (pool: any): Promise<PayloadSyncCache | null> => {
  try {
    const res = await pool.query('SELECT data FROM app_state WHERE id = $1', ['payload_sync_cache']);
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data;
    }
  } catch {
    // ignore
  }
  return null;
};

export const syncFromPayload = async (
  pool: any,
  maliciousInspector?: (obj: any) => { isMalicious: boolean; reason?: string }
): Promise<{ success: boolean; error?: string; cache?: PayloadSyncCache }> => {
  const cfg = getPayloadConfig();
  if (!cfg.configured) {
    return { success: false, error: 'PAYLOAD_CMS_URL belum dikonfigurasi pada Environment Variables.' };
  }

  const settings = await getCmsSettings(pool);
  const postsCol = settings.postsCollection || 'posts';
  const pagesCol = settings.pagesCollection || 'pages';
  const guidesCol = settings.guidesCollection || 'guides';

  const syncedPosts: any[] = [];
  const syncedPages: Record<string, any> = {};
  const syncedGuides: any[] = [];

  try {
    // 1. Sync Posts Collection
    const postsRes = await payloadFetch(`/api/${encodeURIComponent(postsCol)}?limit=100&depth=2&sort=-createdAt`, cfg);
    if (postsRes.ok && Array.isArray(postsRes.data?.docs)) {
      for (const doc of postsRes.data.docs) {
        const mdContent = payloadRichTextToMarkdown(doc.content || doc.body, cfg.url);
        const rawStatus = doc._status || doc.status || 'published';
        const status = rawStatus === 'draft' ? 'draft' : 'published';
        const postItem = {
          id: `payload_${doc.id}`,
          title: String(doc.title || 'Tanpa Judul'),
          slug: String(doc.slug || doc.id),
          excerpt: String(doc.excerpt || doc.summary || mdContent.slice(0, 160)),
          content: mdContent,
          coverImage: resolveMediaUrl(cfg.url, doc.coverImage || doc.heroImage || doc.thumbnail),
          category: String(doc.category?.name || doc.category?.title || doc.category || 'Edukasi Finansial'),
          author: String(doc.author?.name || doc.authorName || 'Tim Portal Uang'),
          readingTime: Number(doc.readingTime || estimateReadTimeMinutes(mdContent)),
          seoTitle: String(doc.meta?.title || doc.seoTitle || ''),
          seoDescription: String(doc.meta?.description || doc.seoDescription || ''),
          createdAt: doc.publishedAt || doc.createdAt || new Date().toISOString(),
          updatedAt: doc.updatedAt || new Date().toISOString(),
          status,
          source: 'payload',
        };
        if (!maliciousInspector || !maliciousInspector(postItem).isMalicious) {
          syncedPosts.push(postItem);
        }
      }
    }

    // 2. Sync Pages Collection (about, privacy, terms, faq, blog, features)
    const pagesRes = await payloadFetch(`/api/${encodeURIComponent(pagesCol)}?limit=50&depth=2`, cfg);
    if (pagesRes.ok && Array.isArray(pagesRes.data?.docs)) {
      for (const doc of pagesRes.data.docs) {
        const slug = String(doc.slug || '').trim().toLowerCase();
        if (!slug) continue;
        const mdContent = payloadRichTextToMarkdown(doc.content || doc.body || doc.layout, cfg.url);
        const pageObj = {
          title: String(doc.title || ''),
          content: mdContent,
          updatedAt: doc.updatedAt || new Date().toISOString(),
          seoTitle: String(doc.meta?.title || ''),
          seoDescription: String(doc.meta?.description || ''),
          source: 'payload' as const,
        };
        if (!maliciousInspector || !maliciousInspector(pageObj).isMalicious) {
          syncedPages[slug] = pageObj;
        }
      }
    }

    // 3. Sync Guides Collection (Long-form knowledge base for /app/guide)
    const guidesRes = await payloadFetch(`/api/${encodeURIComponent(guidesCol)}?limit=100&depth=2&sort=chapterNumber`, cfg);
    if (guidesRes.ok && Array.isArray(guidesRes.data?.docs)) {
      guidesRes.data.docs.forEach((doc: any, idx: number) => {
        const rawStatus = doc._status || doc.status || 'published';
        if (rawStatus === 'draft') return;
        const mdContent = payloadRichTextToMarkdown(doc.content || doc.body, cfg.url);
        const takeaways = Array.isArray(doc.keyTakeaways)
          ? doc.keyTakeaways.map((k: any) => String(k?.point || k?.text || k || '')).filter(Boolean)
          : [];
        const guideObj = {
          id: `payload_guide_${doc.id}`,
          chapterNumber: Number(doc.chapterNumber || doc.order || idx + 1),
          title: String(doc.title || 'Panduan'),
          slug: String(doc.slug || doc.id),
          category: String(doc.category || 'Dasar Finansial'),
          readTimeMinutes: Number(doc.readTimeMinutes || estimateReadTimeMinutes(mdContent)),
          summary: String(doc.summary || doc.excerpt || ''),
          content: mdContent ? [mdContent] : [],
          markdownContent: mdContent,
          keyTakeaways: takeaways,
          actionableStep: String(doc.actionableStep || 'Praktikkan panduan ini langsung pada menu dashboard Portal Uang.'),
          actionRoute: String(doc.actionRoute || '/app/dashboard'),
          source: 'payload',
        };
        if (!maliciousInspector || !maliciousInspector(guideObj).isMalicious) {
          syncedGuides.push(guideObj);
        }
      });
    }

    const cache: PayloadSyncCache = {
      lastSyncedAt: new Date().toISOString(),
      posts: syncedPosts,
      pages: syncedPages,
      guides: syncedGuides,
      stats: {
        postsCount: syncedPosts.length,
        pagesCount: Object.keys(syncedPages).length,
        guidesCount: syncedGuides.length,
      },
    };

    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      ['payload_sync_cache', JSON.stringify(cache)]
    );

    return { success: true, cache };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal sinkronisasi data dari Payload CMS.' };
  }
};

export const verifyPayloadWebhookSecret = (providedSecret: string, expectedSecret: string): boolean => {
  if (!expectedSecret) return false;
  const a = Buffer.from(String(providedSecret || '').trim());
  const b = Buffer.from(String(expectedSecret || '').trim());
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export const PAYLOAD_SCHEMA_BLUEPRINT = `// payload.config.ts — Payload CMS v3 + Supabase PostgreSQL (Schema Terpisah 'payload')
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

const syncWebhookHook = async ({ doc, req }: any) => {
  const targetUrl = process.env.PORTAL_UANG_WEBHOOK_URL // https://portaluang.id/api/webhooks/payload
  const secret = process.env.PAYLOAD_WEBHOOK_SECRET
  if (!targetUrl || !secret) return doc
  await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-payload-webhook-secret': secret },
    body: JSON.stringify({ collection: req?.collection?.config?.slug, id: doc?.id }),
  }).catch(() => {})
  return doc
}

export default buildConfig({
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    schemaName: 'payload', // Aman berdampingan di Supabase tanpa mengganggu tabel Portal Uang
  }),
  collections: [
    {
      slug: 'posts',
      versions: { drafts: true },
      access: { read: () => true },
      hooks: { afterChange: [syncWebhookHook] },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'category', type: 'text', defaultValue: 'Edukasi Finansial' },
        { name: 'excerpt', type: 'textarea' },
        { name: 'coverImage', type: 'text', label: 'URL Gambar Cover' },
        { name: 'content', type: 'richText', required: true },
        { name: 'publishedAt', type: 'date' },
      ],
    },
    {
      slug: 'pages',
      access: { read: () => true },
      hooks: { afterChange: [syncWebhookHook] },
      fields: [
        { name: 'slug', type: 'select', required: true, unique: true, options: ['about', 'blog', 'faq', 'privacy', 'terms', 'features'] },
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText', required: true },
      ],
    },
    {
      slug: 'guides',
      versions: { drafts: true },
      access: { read: () => true },
      hooks: { afterChange: [syncWebhookHook] },
      fields: [
        { name: 'chapterNumber', type: 'number', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'category', type: 'text', required: true },
        { name: 'readTimeMinutes', type: 'number', defaultValue: 5 },
        { name: 'summary', type: 'textarea', required: true },
        { name: 'content', type: 'richText', required: true },
        { name: 'keyTakeaways', type: 'array', fields: [{ name: 'point', type: 'text' }] },
        { name: 'actionableStep', type: 'text' },
        { name: 'actionRoute', type: 'text', defaultValue: '/app/dashboard' },
      ],
    },
  ],
})`;
