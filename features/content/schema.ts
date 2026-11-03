import { z } from 'zod';

const dateString = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期必须为 YYYY-MM-DD'), z.date()])
  .transform((value) => (typeof value === 'string' ? value : value.toISOString().slice(0, 10)));

export const postFrontmatterSchema = z.object({
  title: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能使用小写字母、数字和连字符'),
  description: z.string().min(1).max(160),
  publishedAt: dateString,
  updatedAt: dateString.optional(),
  status: z.enum(['draft', 'published']),
  tags: z.array(z.string().min(1).max(24)).min(1).max(5),
  cover: z
    .object({
      src: z.string().min(1),
      alt: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      caption: z.string().max(200).optional(),
    })
    .optional(),
  featured: z.boolean().optional().default(false),
  canonical: z.string().url().optional(),
  ogImage: z.string().optional(),
  locale: z.literal('zh-CN').optional().default('zh-CN'),
});

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export type PostMeta = PostFrontmatter & {
  readingMinutes: number;
  wordCount: number;
  filePath: string;
};

export type Post = PostMeta & {
  content: string;
};
