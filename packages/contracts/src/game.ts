import { z } from "zod";

export const SuitSchema = z.enum(["carnivore", "herbivore", "bird", "reptile"]);
export type Suit = z.infer<typeof SuitSchema>;

export const DisplayRankSchema = z.enum([
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "C", "B", "A",
]);
export type DisplayRank = z.infer<typeof DisplayRankSchema>;

export const GamePhaseSchema = z.enum([
  "waiting",
  "dealing",
  "playing",
  "resolving_trick",
  "hand_complete",
  "match_complete",
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const ClientCommandTypeSchema = z.enum([
  "READY",
  "START_MATCH",
  "PLAY_CARD",
  "PLAY_SPECIAL",
  "PASS_SPECIAL",
  "SURRENDER",
]);
export type ClientCommandType = z.infer<typeof ClientCommandTypeSchema>;

export const SpecialSlugSchema = z.enum([
  "adrenaline",
  "poison",
  "chameleon",
  "shield",
  "scout",
  "silence",
  "anchor",
]);
export type SpecialSlug = z.infer<typeof SpecialSlugSchema>;

export const PlayCardPayloadSchema = z.object({
  cardInstanceId: z.string().min(1),
  declareChameleon: z.boolean().optional(),
});

export const PlaySpecialPayloadSchema = z.object({
  specialInstanceId: z.string().min(1),
  targetSeat: z.number().int().min(0).max(3).optional(),
  targetSuit: SuitSchema.optional(),
  targetPlayIndex: z.number().int().min(0).optional(),
});

export const ClientCommandSchema = z.object({
  type: ClientCommandTypeSchema,
  commandId: z.string().uuid(),
  roomId: z.string().min(1),
  seat: z.number().int().min(0).max(3).optional(),
  payload: z
    .union([PlayCardPayloadSchema, PlaySpecialPayloadSchema, z.object({})])
    .optional(),
  clientSeq: z.number().int().nonnegative(),
});

export type ClientCommand = z.infer<typeof ClientCommandSchema>;

export const ServerEventTypeSchema = z.enum([
  "room_state",
  "game_state",
  "error",
  "scout_result",
  "match_reward",
]);
export type ServerEventType = z.infer<typeof ServerEventTypeSchema>;

export const RoomModeSchema = z.enum(["private", "quick"]);
export type RoomMode = z.infer<typeof RoomModeSchema>;

export const IdentitySchema = z.object({
  kind: z.enum(["guest", "authenticated"]),
  userId: z.string().optional(),
  displayName: z.string().min(1).max(32),
  sessionId: z.string().min(1),
});
export type Identity = z.infer<typeof IdentitySchema>;

export const GameTicketClaimsSchema = z.object({
  sub: z.string(),
  displayName: z.string(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string().optional(),
});
export type GameTicketClaims = z.infer<typeof GameTicketClaimsSchema>;

export const RewardEventSchema = z.object({
  eventId: z.string().uuid(),
  matchId: z.string().uuid(),
  userId: z.string(),
  teamResult: z.enum(["win", "loss"]),
  createdAt: z.string(),
  signature: z.string().optional(),
});
export type RewardEvent = z.infer<typeof RewardEventSchema>;

export const SEATS = 4 as const;
export const TEAM_BY_SEAT = [0, 1, 0, 1] as const;
