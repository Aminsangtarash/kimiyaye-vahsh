import { z } from "zod";

export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GAME_SERVER_PORT: z.coerce.number().int().positive().default(4010),
  GAME_SERVER_HOST: z.string().default("0.0.0.0"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  GAME_TICKET_SECRET: z.string().min(16).default("dev-ticket-secret-change-me"),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  RECONNECT_GRACE_MS: z.coerce.number().int().positive().default(60_000),
  INACTIVITY_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  MAIN_SITE_JWT_ISSUER: z.string().optional(),
  MAIN_SITE_JWT_PUBLIC_KEY: z.string().optional(),
  REWARD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  REWARD_WEBHOOK_HMAC_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function loadServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return ServerEnvSchema.parse({
    NODE_ENV: env.NODE_ENV,
    GAME_SERVER_PORT: env.GAME_SERVER_PORT,
    GAME_SERVER_HOST: env.GAME_SERVER_HOST,
    CORS_ORIGINS: env.CORS_ORIGINS,
    GAME_TICKET_SECRET: env.GAME_TICKET_SECRET,
    SESSION_SECRET: env.SESSION_SECRET,
    RECONNECT_GRACE_MS: env.RECONNECT_GRACE_MS,
    INACTIVITY_TIMEOUT_MS: env.INACTIVITY_TIMEOUT_MS,
    DATABASE_URL: env.DATABASE_URL || undefined,
    REDIS_URL: env.REDIS_URL || undefined,
    MAIN_SITE_JWT_ISSUER: env.MAIN_SITE_JWT_ISSUER,
    MAIN_SITE_JWT_PUBLIC_KEY: env.MAIN_SITE_JWT_PUBLIC_KEY,
    REWARD_WEBHOOK_URL: env.REWARD_WEBHOOK_URL,
    REWARD_WEBHOOK_HMAC_SECRET: env.REWARD_WEBHOOK_HMAC_SECRET,
  });
}
