import { z } from 'zod';

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SITE_URL: z.string().url(),
  DATABASE_PATH: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  COMMENT_IP_PEPPER: z.string().min(16),
  TRUSTED_ORIGINS: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  SMTP_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  SMTP_FROM: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  ADMIN_EMAIL: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  ADMIN_USERNAME: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  ADMIN_PASSWORD: z
    .string()
    .min(8)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
