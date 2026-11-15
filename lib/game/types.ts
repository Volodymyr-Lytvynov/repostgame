export const MODES = ["ratio", "dms", "explain", "sabotage"] as const;

export type Mode = (typeof MODES)[number];

export type Language = "en" | "ru";

export type Intensity = "casual" | "unhinged" | "footprint";

export type Phase =
  | "lobby"
  | "generating"
  | "round_intro"
  | "writing"
  | "reveal"
  | "voting"
  | "results"
  | "leaderboard"
  | "favorites"
  | "game_over";

export type Role = "reply" | "answer" | "context" | "fragment";

export type GameConfig = {
  language: Language;
  intensity: Intensity;
  exclusions: string;
  rounds: number;
  playlist: Mode[];
  finaleMultiplier: boolean;
  searchBudget: number;
};

export type ResolvedImage = {
  url: string;
  thumb: string;
  author: string;
  license: string;
  source: string;
};

export type ImageGroup = {
  query: string;
  images: ResolvedImage[];
};

export type AccountDraft = {
  name: string;
  handle: string;
  verified: boolean;
  avatarGroup: number;
};

export type FictionalAccount = AccountDraft & {
  image: ResolvedImage | null;
  color: string;
};

export type RatioPrompt = {
  kind: "post";
  account: number;
  text: string;
  fictionLikes: number;
  fictionViews: number;
  ago: string;
};

export type DmPrompt = {
  kind: "question";
  text: string;
  sender: string;
};

export type ExplainPrompt = {
  kind: "scenario";
  text: string;
};

export type SabotagePrompt = {
  kind: "template";
  instructionA: string;
  instructionB: string;
  pattern: string;
  fallbackA: string;
  fallbackB: string;
};

export type Prompt = RatioPrompt | DmPrompt | ExplainPrompt | SabotagePrompt;

export type SessionManifest = {
  source: "model" | "backup";
  imageGroups: ImageGroup[];
  accounts: AccountDraft[];
  prompts: Prompt[][];
};

export type Assignment = {
  id: string;
  round: number;
  prompt: number;
  playerId: string;
  slot: number;
  role: Role;
};

export type Submission = {
  id: string;
  assignmentId: string;
  playerId: string;
  text: string;
  removed: boolean;
  hidden: boolean;
};

export type Vote = {
  round: number;
  contest: string;
  voterId: string;
  entryId: string;
};

export type Favorite = {
  voterId: string;
  entryId: string;
};

export type ScoreEvent = {
  round: number;
  contest: string;
  playerId: string;
  delta: number;
  reason: string;
};

export type BadgeKind =
  | "ratioed"
  | "bro_fell_off"
  | "shared_brain_cell"
  | "viral"
  | "digital_footprint"
  | "partners_in_crime"
  | "chronically_online";

export type Badge = {
  kind: BadgeKind;
  playerId: string;
  round: number;
  contest?: string;
};

export type Player = {
  id: string;
  token: string;
  name: string;
  color: string;
  bot: boolean;
  host: boolean;
  joinedAt: number;
};

export type RoomState = {
  code: string;
  demo: boolean;
  cap: number;
  hostToken: string;
  match: number;
  createdAt: number;
  players: Player[];
  status: "lobby" | "playing" | "finished";
  phase: Phase;
  config: GameConfig;
  round: number;
  writeStep: number;
  contest: number;
  accounts: FictionalAccount[];
  imageGroups: ImageGroup[];
  prompts: Prompt[][];
  assignments: Assignment[];
  orders: number[][];
  submissions: Submission[];
  votes: Vote[];
  favorites: Favorite[];
  scores: Record<string, number>;
  log: ScoreEvent[];
  badges: Badge[];
  scored: string[];
  deadline: number | null;
  seats: string[];
  seed: number;
  generationLock: number | null;
  generationToken: string | null;
  promptSource: "model" | "backup" | null;
  debug: boolean;
  paused: boolean;
  pauseRemaining: number | null;
};

export type PlayerTask = {
  assignmentId: string;
  role: Role;
  max: number;
  title: string;
  prompt: string;
  aside: string;
  placeholder: string;
};

export type FeedAccount = {
  name: string;
  handle: string;
  verified: boolean;
  initials: string;
  color: string;
  image: string | null;
  license: string;
  author: string;
};

export type FeedCard = {
  id: string;
  mode: Mode;
  round: number;
  prompt: number;
  account: FeedAccount | null;
  fictionLikes: number;
  fictionViews: number;
  ago: string;
  promptText: string;
  questionRevealed: boolean;
  sender: string;
  combined: string;
  textA: string;
  textB: string;
  authorA: string;
  authorB: string;
  colorA: string;
  colorB: string;
  showAuthors: boolean;
  votesA: number;
  votesB: number;
  likesA: number;
  likesB: number;
  skipped: boolean;
  entryA: string;
  entryB: string;
  votable: boolean;
  submissionA: string | null;
  submissionB: string | null;
  favoriteVotes: number;
};

export type ClientView = {
  version: number;
  serverNow: number;
  code: string;
  demo: boolean;
  cap: number;
  match: number;
  status: RoomState["status"];
  phase: Phase;
  round: number;
  roundCount: number;
  mode: Mode | null;
  writeStep: number;
  contest: number;
  contestCount: number;
  playlist: Mode[];
  config: GameConfig;
  deadline: number | null;
  debug: boolean;
  paused: boolean;
  pauseRemaining: number | null;
  players: Array<{ id: string; name: string; color: string; bot: boolean; host: boolean; score: number }>;
  readyIds: string[];
  stepTotal: number;
  generation: { source: RoomState["promptSource"] };
  spotlight: FeedCard | null;
  board: FeedCard[];
  gallery: FeedCard[];
  scoreboard: Array<{
    id: string;
    name: string;
    color: string;
    total: number;
    delta: number;
    reason: string;
    badges: BadgeKind[];
  }>;
  badges: Badge[];
  winners: string[];
  you: {
    id: string;
    name: string;
    host: boolean;
    tasks: PlayerTask[];
    choices: string[];
    votedEntry: string | null;
    favorite: string | null;
  } | null;
  isHost: boolean;
  joinPath: string;
};
