import type { Match, Phase, StandingRow, Team, TieBreakerRule, TournamentInfo } from "@/lib/types";

type StandingSeed = [
  teamId: string,
  played: number,
  wins: number,
  draws: number,
  losses: number,
  goalsFor: number,
  goalsAgainst: number,
  points: number,
  status: StandingRow["status"],
];

export const defaultTieBreakers = (): TieBreakerRule[] => [
  { id: "tb-points", label: "Points", key: "points", enabled: true },
  { id: "tb-goal-difference", label: "Goal difference", key: "goalDifference", enabled: true },
  { id: "tb-goals-scored", label: "Goals scored", key: "goalsScored", enabled: true },
  { id: "tb-wins", label: "Wins", key: "wins", enabled: true },
  { id: "tb-head-to-head", label: "Head-to-head", key: "headToHead", enabled: true },
];

export const initialInfo: TournamentInfo = {
  name: "Continental Cup 2026",
  description: "Flexible multi-phase tournament setup with instant recalculation.",
  logo: "",
  participantCount: 8,
};

export const initialPhases: Phase[] = [
  {
    id: "phase-groups",
    name: "Group Stage",
    type: "groups",
    groupSettings: {
      groupCount: 2,
      teamsPerGroup: 4,
      allowUnevenGroups: false,
      assignment: "automatic",
      doubleRoundRobin: false,
      homeAway: false,
      qualifiersPerGroup: 2,
      bestSecondPlaceCount: 0,
      bestThirdPlaceCount: 0,
      points: { win: 3, draw: 1, loss: 0 },
      tieBreakers: defaultTieBreakers(),
      customColumns: [],
    },
  },
  {
    id: "phase-knockout",
    name: "Championship Bracket",
    type: "knockout",
    knockoutSettings: {
      format: "Single Elimination",
      bestOf: 1,
      thirdPlaceMatch: true,
      allowByes: false,
      seeding: "Ranked",
    },
  },
];

export const initialTeams: Team[] = [
  ["Falcons", "#1769ff", "FAL"],
  ["Titans", "#16a34a", "TIT"],
  ["Rovers", "#f59e0b", "ROV"],
  ["Storm", "#dc2626", "STM"],
  ["Vikings", "#0f172a", "VIK"],
  ["United", "#7c3aed", "UNI"],
  ["Wolves", "#0891b2", "WOL"],
  ["Giants", "#ea580c", "GIA"],
].map(([name, color, abbreviation], index) => ({
  id: `team-${index + 1}`,
  name,
  color,
  abbreviation,
  logo: "",
}));

export const initialMatches: Match[] = [];

export const initialStandings: StandingRow[] = ([
  ["team-1", 1, 1, 0, 0, 2, 1, 3, "qualifies"],
  ["team-3", 1, 0, 1, 0, 1, 1, 1, "playoff"],
  ["team-4", 1, 0, 1, 0, 1, 1, 1, "playoff"],
  ["team-2", 1, 0, 0, 1, 1, 2, 0, "eliminated"],
] satisfies StandingSeed[]).map(([teamId, played, wins, draws, losses, goalsFor, goalsAgainst, points, status]) => ({
  teamId,
  played,
  wins,
  draws,
  losses,
  goalsFor,
  goalsAgainst,
  points,
  customValues: {},
  status,
}));
