export type PhaseType = "groups" | "swiss" | "league" | "knockout";
export type SetupStep = "info" | "participants" | "teams" | "phases" | "rules" | "seeding" | "review" | "start";

export type BuiltInTieBreakerKey =
  | "points"
  | "goalDifference"
  | "goalsScored"
  | "goalsConceded"
  | "headToHead"
  | "wins"
  | "fairPlay"
  | "randomDraw";

export type CustomColumnType = "number" | "text" | "boolean" | "percentage";
export type RankingDirection = "higher" | "lower";
export type ColumnEntryMode = "manual" | "auto";

export interface CustomColumn {
  id: string;
  name: string;
  type: CustomColumnType;
  entryMode: ColumnEntryMode;
  affectsRanking: boolean;
  rankingDirection?: RankingDirection;
  addsToPoints?: boolean;
  defaultValue?: number | string | boolean;
}

export interface TieBreakerRule {
  id: string;
  label: string;
  key: BuiltInTieBreakerKey | `custom:${string}`;
  enabled: boolean;
}

export interface TournamentInfo {
  name: string;
  description: string;
  logo: string;
  participantCount: number;
}

export interface GroupSettings {
  groupCount: number;
  teamsPerGroup: number;
  allowUnevenGroups: boolean;
  assignment: "automatic" | "manual";
  doubleRoundRobin: boolean;
  homeAway: boolean;
  qualifiersPerGroup: number;
  bestSecondPlaceCount: number;
  bestThirdPlaceCount: number;
  points: {
    win: number;
    draw: number;
    loss: number;
  };
  tieBreakers: TieBreakerRule[];
  customColumns: CustomColumn[];
}

export interface SwissSettings {
  rounds: number;
  pairing: "Standard Swiss" | "Accelerated Swiss";
  noRematches: boolean;
  allowByes: boolean;
  byeHandling: "Lowest ranked" | "Random" | "Manual";
  points: GroupSettings["points"];
  tieBreakers: TieBreakerRule[];
  customColumns: CustomColumn[];
  advancingTeams: number;
}

export interface LeagueSettings {
  rounds: number;
  homeAway: boolean;
  promotion: number;
  relegation: number;
  playoffSpots: number;
  points: GroupSettings["points"];
  tieBreakers: TieBreakerRule[];
  customColumns: CustomColumn[];
}

export interface KnockoutSettings {
  format: "Single Elimination" | "Double Elimination";
  bestOf: 1 | 3 | 5 | 7;
  thirdPlaceMatch: boolean;
  allowByes: boolean;
  seeding: "Ranked" | "Random Draw" | "Manual";
  expectedTeams?: number;
}

export interface Phase {
  id: string;
  name: string;
  type: PhaseType;
  inputTeams?: number;
  outputTeams?: number;
  estimatedTeams?: number;
  groupAssignments?: string[][];
  groupSettings?: GroupSettings;
  swissSettings?: SwissSettings;
  leagueSettings?: LeagueSettings;
  knockoutSettings?: KnockoutSettings;
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  color: string;
  abbreviation: string;
}

export interface Match {
  id: string;
  phaseId: string;
  roundLabel: string;
  groupIndex?: number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  played: boolean;
  isBye?: boolean;
}

export type CustomColumnValue = number | string | boolean;

export interface StandingRow {
  teamId: string;
  phaseId?: string;
  groupIndex?: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  customValues: Record<string, CustomColumnValue>;
  status: "qualifies" | "playoff" | "eliminated";
}
