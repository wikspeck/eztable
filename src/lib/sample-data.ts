import type { Match, Phase, StandingRow, Team, TournamentInfo } from "@/lib/types";

export const initialInfo: TournamentInfo = {
  name: "Continental Cup 2026",
  description: "Flexible multi-phase tournament setup with instant recalculation.",
  logo: "",
};

export const initialPhases: Phase[] = [
  {
    id: "phase-groups",
    name: "Group Stage",
    type: "groups",
    groupSettings: {
      groupCount: 4,
      teamsPerGroup: 4,
      assignment: "automatic",
      doubleRoundRobin: false,
      homeAway: false,
      points: { win: 3, draw: 1, loss: 0 },
      tieBreakers: ["Goal difference", "Goals scored", "Head-to-head", "Wins"],
      qualification: "Top 2 + best 4 third-placed teams",
    },
  },
  {
    id: "phase-swiss",
    name: "Swiss Stage",
    type: "swiss",
    swissSettings: {
      rounds: 5,
      pairing: "Standard Swiss",
      noRematches: true,
      byeHandling: "Lowest ranked",
    },
  },
  {
    id: "phase-knockout",
    name: "Championship Bracket",
    type: "knockout",
    knockoutSettings: {
      format: "Single Elimination",
      bestOf: 3,
      thirdPlaceMatch: true,
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

export const initialMatches: Match[] = [
  {
    id: "match-1",
    phaseId: "phase-groups",
    roundLabel: "Group A · Matchday 1",
    teamA: "team-1",
    teamB: "team-2",
    scoreA: 2,
    scoreB: 1,
    played: true,
  },
  {
    id: "match-2",
    phaseId: "phase-groups",
    roundLabel: "Group A · Matchday 1",
    teamA: "team-3",
    teamB: "team-4",
    scoreA: 1,
    scoreB: 1,
    played: true,
  },
  {
    id: "match-3",
    phaseId: "phase-swiss",
    roundLabel: "Swiss Round 1",
    teamA: "team-5",
    teamB: "team-6",
    scoreA: 0,
    scoreB: 0,
    played: false,
  },
  {
    id: "match-4",
    phaseId: "phase-knockout",
    roundLabel: "Quarterfinal 1",
    teamA: "team-7",
    teamB: "team-8",
    scoreA: 0,
    scoreB: 0,
    played: false,
  },
];

export const initialStandings: StandingRow[] = [
  ["team-1", 1, 1, 0, 0, 2, 1, 3, "qualifies"],
  ["team-3", 1, 0, 1, 0, 1, 1, 1, "playoff"],
  ["team-4", 1, 0, 1, 0, 1, 1, 1, "playoff"],
  ["team-2", 1, 0, 0, 1, 1, 2, 0, "eliminated"],
].map(([teamId, played, wins, draws, losses, goalsFor, goalsAgainst, points, status]) => ({
  teamId,
  played,
  wins,
  draws,
  losses,
  goalsFor,
  goalsAgainst,
  points,
  status,
}));
