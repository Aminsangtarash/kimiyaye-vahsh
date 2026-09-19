import { z } from "zod";

/** Printed suit on animal cards — same value space as AnimalRealm, different meaning. */
export const SuitSchema = z.enum(["carnivore", "herbivore", "bird", "reptile"]);
export type Suit = z.infer<typeof SuitSchema>;

/**
 * Player-represented realm (public identity).
 * Canonical lowercase values — do not use plural forms (e.g. "birds").
 */
export const AnimalRealmSchema = SuitSchema;
export type AnimalRealm = Suit;

export const ALL_ANIMAL_REALMS: readonly AnimalRealm[] = [
  "carnivore",
  "herbivore",
  "bird",
  "reptile",
] as const;

export const DisplayRankSchema = z.enum([
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "C", "B", "A",
]);
export type DisplayRank = z.infer<typeof DisplayRankSchema>;

export const GamePhaseSchema = z.enum([
  "waiting",
  "dealing",
  "hunter_selection",
  "dealing_remainder",
  "playing",
  "resolving_trick",
  "hand_complete",
  "match_complete",
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

/** Fixed-Hunter (Hokm-inspired) ruleset — supersedes dynamic leader-hunter. */
export const RULES_VERSION = 3;

export const ControllerTypeSchema = z.enum(["human", "bot"]);
export type ControllerType = z.infer<typeof ControllerTypeSchema>;

export const LobbyPhaseSchema = z.enum([
  "WAITING_FOR_PLAYERS",
  "WAITING_FOR_REALMS",
  "STARTING",
  "IN_MATCH",
  "COMPLETED",
]);
export type LobbyPhase = z.infer<typeof LobbyPhaseSchema>;

export const ClientCommandTypeSchema = z.enum([
  "SELECT_REALM",
  "SELECT_HUNTER_REALM",
  "ADD_BOT",
  "FILL_BOTS",
  "REMOVE_BOT",
  "PLAY_CARD",
  "REQUEST_SPECIAL_DRAW",
  "DISCARD_SPECIAL",
  "PLAY_SPECIAL",
  "PASS_SPECIAL",
  "SURRENDER",
  "CONTINUE_HAND",
  /** @deprecated V1 — ignored for V2 start gate */
  "READY",
  /** @deprecated V1 host start — V2 uses auto-start */
  "START_MATCH",
]);
export type ClientCommandType = z.infer<typeof ClientCommandTypeSchema>;

export const SelectHunterRealmPayloadSchema = z.object({
  realm: AnimalRealmSchema,
});

/** Special Cards V1 active set. Legacy specials are inactive. */
export const SpecialSlugSchema = z.enum([
  "doping",
  "trap",
  "chameleon",
  "inversion",
  "team_bond",
  "null",
  "hunt_command",
  "armageddon",
]);
export type SpecialSlug = z.infer<typeof SpecialSlugSchema>;

export const SPECIAL_RULES_VERSION = 1 as const;

export const PlayCardPayloadSchema = z.object({
  cardInstanceId: z.string().min(1),
  /** Special Cards V1 — attach 0–2 specials (Chameleon + one other, or a single special). */
  specialInstanceIds: z.array(z.string().min(1)).max(2).optional(),
  /** @deprecated legacy chameleon flag — ignored under specialRulesVersion=1 */
  declareChameleon: z.boolean().optional(),
});

export const DiscardSpecialPayloadSchema = z.object({
  specialInstanceId: z.string().min(1),
});

export const PlaySpecialPayloadSchema = z.object({
  specialInstanceId: z.string().min(1),
  targetSeat: z.number().int().min(0).max(3).optional(),
  targetSuit: SuitSchema.optional(),
  targetPlayIndex: z.number().int().min(0).optional(),
});

export const SelectRealmPayloadSchema = z.object({
  realm: AnimalRealmSchema,
});

export const SeatPayloadSchema = z.object({
  targetSeat: z.number().int().min(0).max(3).optional(),
});

export const ClientCommandSchema = z.object({
  type: ClientCommandTypeSchema,
  commandId: z.string().uuid(),
  roomId: z.string().min(1),
  seat: z.number().int().min(0).max(3).optional(),
  payload: z
    .union([
      PlayCardPayloadSchema,
      PlaySpecialPayloadSchema,
      DiscardSpecialPayloadSchema,
      SelectRealmPayloadSchema,
      SelectHunterRealmPayloadSchema,
      SeatPayloadSchema,
      z.object({}),
    ])
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
  "countdown",
]);
export type ServerEventType = z.infer<typeof ServerEventTypeSchema>;

export const RoomModeSchema = z.enum(["private", "quick", "bots"]);
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
  hasBots: z.boolean().optional(),
  mvpParticipantIds: z.array(z.string()).optional(),
  impactScore: z.number().optional(),
});
export type RewardEvent = z.infer<typeof RewardEventSchema>;

export const ParticipantResultSchema = z.object({
  participantId: z.string(),
  seat: z.number().int().min(0).max(3),
  teamId: z.number().int().min(0).max(1),
  realm: AnimalRealmSchema,
  controllerType: ControllerTypeSchema,
  tricksWon: z.number().int().nonnegative(),
  successfulSpecials: z.number().int().nonnegative(),
  legendaryCounters: z.number().int().nonnegative(),
  teamAssists: z.number().int().nonnegative(),
  humanTimeouts: z.number().int().nonnegative(),
  impactScore: z.number(),
});
export type ParticipantResult = z.infer<typeof ParticipantResultSchema>;

export const MatchResultSummarySchema = z.object({
  winningTeamId: z.number().int().min(0).max(1).nullable(),
  participants: z.array(ParticipantResultSchema),
  mvpParticipantIds: z.array(z.string()),
  hasBots: z.boolean(),
  botSeatCount: z.number().int().nonnegative(),
});
export type MatchResultSummary = z.infer<typeof MatchResultSummarySchema>;

export const SEATS = 4 as const;
export const TEAM_BY_SEAT = [0, 1, 0, 1] as const;

export const REALM_UI: Record<
  AnimalRealm,
  { fa: string; color: string; symbol: string }
> = {
  carnivore: { fa: "گوشتخواران", color: "#a01c24", symbol: "lion" },
  herbivore: { fa: "گیاه‌خواران", color: "#227a44", symbol: "elephant" },
  bird: { fa: "پرندگان", color: "#1c4896", symbol: "eagle" },
  reptile: { fa: "خزندگان", color: "#6230a0", symbol: "serpent" },
};
