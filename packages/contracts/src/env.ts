import { z } from "zod";

function boolEnv(defaultValue: boolean) {
  return z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return defaultValue;
    if (typeof v === "boolean") return v;
    const s = String(v).toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
    return defaultValue;
  }, z.boolean());
}

export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GAME_SERVER_PORT: z.coerce.number().int().positive().default(4010),
  GAME_SERVER_HOST: z.string().default("0.0.0.0"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  GAME_TICKET_SECRET: z.string().min(16).default("dev-ticket-secret-change-me"),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  RECONNECT_GRACE_MS: z.coerce.number().int().positive().default(60_000),
  INACTIVITY_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  MATCH_START_COUNTDOWN_MS: z.coerce.number().int().positive().default(3_000),
  QUICK_MATCH_BOT_FILL_AFTER_MS: z.coerce.number().int().positive().default(45_000),
  BOT_ACTION_DELAY_MS: z.coerce.number().int().nonnegative().default(700),
  V2_SPECIAL_CARDS_ENABLED: boolEnv(false),
  IMPACT_TRICK_WON: z.coerce.number().default(10),
  IMPACT_SUCCESSFUL_SPECIAL: z.coerce.number().default(10),
  IMPACT_LEGENDARY_COUNTER: z.coerce.number().default(20),
  IMPACT_TEAM_ASSIST: z.coerce.number().default(10),
  IMPACT_HUMAN_TIMEOUT: z.coerce.number().default(-5),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  MAIN_SITE_JWT_ISSUER: z.string().optional(),
  MAIN_SITE_JWT_PUBLIC_KEY: z.string().optional(),
  REWARD_WEBHOOK_URL: z.string().optional(),
  REWARD_WEBHOOK_HMAC_SECRET: z.string().optional(),
  REWARD_SKIP_BOT_MATCHES: boolEnv(true),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function loadServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return ServerEnvSchema.parse(env);
}
