export type PhaseType = "groups" | "swiss" | "league" | "knockout";

export type TieBreaker =
  | "Goal difference"
  | "Goals scored"
  | "Goals conceded"
  | "Head-to-head"
  | "Wins"
  | "Fair play"
  | "Random draw";

export interface TournamentInfo {
  name: string;
  description: string;
  logo: string;
  participantCount: number;
}

export interface GroupSettings {
  groupCount: number;
  teamsPerGroup: number;
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
  tieBreakers: TieBreaker[];
}

export interface SwissSettings {
  rounds: number;
  pairing: "Standard Swiss" | "Accelerated Swiss";
  noRematches: boolean;
  allowByes: boolean;
  byeHandling: "Lowest ranked" | "Random" | "Manual";
  points: GroupSettings["points"];
  tieBreakers: TieBreaker[];
}

export interface LeagueSettings {
  rounds: number;
  homeAway: boolean;
  promotion: number;
  relegation: number;
  playoffSpots: number;
  points: GroupSettings["points"];
  tieBreakers: TieBreaker[];
}

export interface KnockoutSettings {
  format: "Single Elimination" | "Double Elimination";
  bestOf: 1 | 3 | 5 | 7;
  thirdPlaceMatch: boolean;
  allowByes: boolean;
  seeding: "Ranked" | "Random Draw" | "Manual";
}

export interface Phase {
  id: string;
  name: string;
  type: PhaseType;
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
  status: "qualifies" | "playoff" | "eliminated";
}
