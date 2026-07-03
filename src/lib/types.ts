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
}

export interface GroupSettings {
  groupCount: number;
  teamsPerGroup: number;
  assignment: "automatic" | "manual";
  doubleRoundRobin: boolean;
  homeAway: boolean;
  points: {
    win: number;
    draw: number;
    loss: number;
  };
  tieBreakers: TieBreaker[];
  qualification: string;
}

export interface SwissSettings {
  rounds: number;
  pairing: "Standard Swiss" | "Accelerated Swiss";
  noRematches: boolean;
  byeHandling: "Lowest ranked" | "Random" | "Manual";
}

export interface LeagueSettings {
  rounds: number;
  homeAway: boolean;
  promotion: number;
  relegation: number;
  playoffSpots: number;
}

export interface KnockoutSettings {
  format: "Single Elimination" | "Double Elimination";
  bestOf: 1 | 3 | 5 | 7;
  thirdPlaceMatch: boolean;
  seeding: "Ranked" | "Random Draw" | "Manual";
}

export interface Phase {
  id: string;
  name: string;
  type: PhaseType;
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
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  played: boolean;
}

export interface StandingRow {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  status: "qualifies" | "playoff" | "eliminated";
}
