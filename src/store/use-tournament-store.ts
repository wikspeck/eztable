import { create } from "zustand";
import { initialInfo, initialPhases, initialTeams } from "@/lib/sample-data";
import type { Match, Phase, PhaseType, StandingRow, Team, TieBreaker, TournamentInfo } from "@/lib/types";

interface TournamentState {
  info: TournamentInfo;
  phases: Phase[];
  teams: Team[];
  matches: Match[];
  standings: StandingRow[];
  currentPhaseId: string;
  wizardStep: number;
  hasStarted: boolean;
  settingsLocked: boolean;
  validationWarnings: string[];
  updateInfo: (payload: TournamentInfo) => void;
  setWizardStep: (step: number) => void;
  addPhase: (type: PhaseType) => void;
  removePhase: (phaseId: string) => void;
  movePhase: (phaseId: string, direction: "up" | "down") => void;
  updatePhaseName: (phaseId: string, name: string) => void;
  updatePhase: (phaseId: string, updater: (phase: Phase) => Phase) => void;
  setParticipantCount: (count: number) => void;
  addTeam: () => void;
  updateTeam: (teamId: string, updater: (team: Team) => Team) => void;
  randomizeGroups: (phaseId: string) => void;
  moveTeamBetweenGroups: (phaseId: string, fromGroupIndex: number, teamId: string, direction: "left" | "right") => void;
  startTournament: () => void;
  unlockSettings: () => void;
  relockSettings: () => void;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number) => void;
}

const defaultTieBreakers: TieBreaker[] = ["Goal difference", "Goals scored", "Head-to-head", "Wins"];
const colorPalette = ["#1769ff", "#16a34a", "#f59e0b", "#dc2626", "#0f172a", "#7c3aed", "#0891b2", "#ea580c"];

function moveItem<T>(items: T[], index: number, target: number) {
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function createTeam(index: number): Team {
  return {
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    logo: "",
    color: colorPalette[index % colorPalette.length],
    abbreviation: `T${index + 1}`,
  };
}

function ensureTeamCount(teams: Team[], count: number) {
  if (teams.length > count) return teams.slice(0, count);
  if (teams.length < count) return [...teams, ...Array.from({ length: count - teams.length }, (_, index) => createTeam(teams.length + index))];
  return teams;
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0;
}

function nextPowerOfTwo(value: number) {
  let current = 1;
  while (current < value) current *= 2;
  return current;
}

function estimateIncomingTeams(phases: Phase[], participantCount: number, targetIndex: number) {
  let current = participantCount;
  for (let index = 0; index < targetIndex; index += 1) {
    const phase = phases[index];
    if (phase.type === "groups" && phase.groupSettings) {
      current = Math.min(
        current,
        phase.groupSettings.groupCount * phase.groupSettings.qualifiersPerGroup +
          phase.groupSettings.bestSecondPlaceCount +
          phase.groupSettings.bestThirdPlaceCount,
      );
    } else if (phase.type === "league" && phase.leagueSettings) {
      current = Math.min(current, Math.max(phase.leagueSettings.playoffSpots, 2));
    } else if (phase.type === "swiss") {
      current = Math.min(current, Math.max(4, Math.floor(current / 2)));
    }
  }
  return current;
}

function createDefaultPhase(type: PhaseType, phases: Phase[], participantCount: number): Phase {
  const estimatedTeams = estimateIncomingTeams(phases, participantCount, phases.length);
  if (type === "groups") {
    const groups = Math.max(2, Math.min(4, Math.ceil(estimatedTeams / 4)));
    return {
      id: `phase-groups-${Date.now()}`,
      name: "Group Stage",
      type,
      estimatedTeams,
      groupSettings: {
        groupCount: groups,
        teamsPerGroup: Math.max(2, Math.ceil(estimatedTeams / groups)),
        assignment: "automatic",
        doubleRoundRobin: false,
        homeAway: false,
        qualifiersPerGroup: 2,
        bestSecondPlaceCount: 0,
        bestThirdPlaceCount: 0,
        points: { win: 3, draw: 1, loss: 0 },
        tieBreakers: [...defaultTieBreakers],
      },
    };
  }
  if (type === "league") {
    return {
      id: `phase-league-${Date.now()}`,
      name: "League Phase",
      type,
      estimatedTeams,
      leagueSettings: {
        rounds: 1,
        homeAway: false,
        promotion: 0,
        relegation: 0,
        playoffSpots: Math.min(4, estimatedTeams),
        points: { win: 3, draw: 1, loss: 0 },
        tieBreakers: [...defaultTieBreakers],
      },
    };
  }
  if (type === "swiss") {
    return {
      id: `phase-swiss-${Date.now()}`,
      name: "Swiss Phase",
      type,
      estimatedTeams,
      swissSettings: {
        rounds: Math.max(3, Math.ceil(Math.log2(Math.max(estimatedTeams, 2)))),
        pairing: "Standard Swiss",
        noRematches: true,
        allowByes: true,
        byeHandling: "Lowest ranked",
        points: { win: 3, draw: 1, loss: 0 },
        tieBreakers: ["Goal difference", "Goals scored", "Wins"],
      },
    };
  }
  return {
    id: `phase-knockout-${Date.now()}`,
    name: "Knockout Phase",
    type,
    estimatedTeams,
    knockoutSettings: {
      format: "Single Elimination",
      bestOf: 1,
      thirdPlaceMatch: false,
      allowByes: false,
      seeding: "Ranked",
    },
  };
}

function generateGroupAssignments(phase: Phase, teams: Team[], participantCount: number) {
  if (!phase.groupSettings) return [];
  const assignments = Array.from({ length: phase.groupSettings.groupCount }, () => [] as string[]);
  shuffle(teams.slice(0, participantCount).map((team) => team.id)).forEach((teamId, index) => {
    assignments[index % assignments.length].push(teamId);
  });
  return assignments;
}

function buildWarnings(info: TournamentInfo, phases: Phase[], teams: Team[]) {
  const warnings: string[] = [];
  if (teams.length !== info.participantCount) {
    warnings.push(`Participant count is ${info.participantCount}, but ${teams.length} teams are configured.`);
  }
  phases.forEach((phase, index) => {
    const incoming = estimateIncomingTeams(phases, info.participantCount, index);
    if (phase.type === "groups" && phase.groupSettings) {
      const slots = phase.groupSettings.groupCount * phase.groupSettings.teamsPerGroup;
      if (incoming > slots) warnings.push(`${phase.name}: ${incoming} teams do not fit into the configured groups.`);
      if (phase.groupSettings.qualifiersPerGroup > phase.groupSettings.teamsPerGroup) {
        warnings.push(`${phase.name}: qualifiers per group cannot exceed teams per group.`);
      }
    }
    if (phase.type === "swiss" && phase.swissSettings && !phase.swissSettings.allowByes && incoming % 2 !== 0) {
      warnings.push(`${phase.name}: an odd number of teams requires byes.`);
    }
    if (phase.type === "knockout" && phase.knockoutSettings && !phase.knockoutSettings.allowByes && !isPowerOfTwo(incoming)) {
      warnings.push(`${phase.name}: ${incoming} teams need byes or a power-of-two field.`);
    }
  });
  return warnings;
}

function buildRoundRobinMatches(teamIds: string[], phaseId: string, groupIndex?: number, label = "Round Robin") {
  const matches: Match[] = [];
  for (let left = 0; left < teamIds.length; left += 1) {
    for (let right = left + 1; right < teamIds.length; right += 1) {
      matches.push({
        id: `${phaseId}-${groupIndex ?? "league"}-${left}-${right}`,
        phaseId,
        roundLabel: `${label} · Match ${matches.length + 1}`,
        groupIndex,
        teamA: teamIds[left],
        teamB: teamIds[right],
        scoreA: 0,
        scoreB: 0,
        played: false,
      });
    }
  }
  return matches;
}

function sortStandings(rows: StandingRow[], tieBreakers: TieBreaker[]) {
  return [...rows].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    for (const tieBreaker of tieBreakers) {
      if (tieBreaker === "Goal difference") {
        const value = right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst);
        if (value !== 0) return value;
      }
      if (tieBreaker === "Goals scored" && right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
      if (tieBreaker === "Goals conceded" && left.goalsAgainst !== right.goalsAgainst) return left.goalsAgainst - right.goalsAgainst;
      if (tieBreaker === "Wins" && right.wins !== left.wins) return right.wins - left.wins;
    }
    return left.teamId.localeCompare(right.teamId);
  });
}

function computeStandings(phases: Phase[], matches: Match[], teams: Team[], participantCount: number) {
  const standings: StandingRow[] = [];
  const activeTeams = teams.slice(0, participantCount);
  phases.forEach((phase) => {
    if (phase.type === "groups" && phase.groupSettings) {
      const settings = phase.groupSettings;
      const assignments = phase.groupAssignments ?? [];
      assignments.forEach((group, groupIndex) => {
        const rows = group.map((teamId) => ({
          teamId,
          phaseId: phase.id,
          groupIndex,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          status: "eliminated" as const,
        }));
        const rowById = Object.fromEntries(rows.map((row) => [row.teamId, row]));
        matches
          .filter((match) => match.phaseId === phase.id && match.groupIndex === groupIndex && match.played)
          .forEach((match) => {
            const home = rowById[match.teamA];
            const away = rowById[match.teamB];
            if (!home || !away) return;
            home.played += 1;
            away.played += 1;
            home.goalsFor += match.scoreA;
            home.goalsAgainst += match.scoreB;
            away.goalsFor += match.scoreB;
            away.goalsAgainst += match.scoreA;
            if (match.scoreA > match.scoreB) {
              home.wins += 1;
              away.losses += 1;
              home.points += settings.points.win;
              away.points += settings.points.loss;
            } else if (match.scoreB > match.scoreA) {
              away.wins += 1;
              home.losses += 1;
              away.points += settings.points.win;
              home.points += settings.points.loss;
            } else {
              home.draws += 1;
              away.draws += 1;
              home.points += settings.points.draw;
              away.points += settings.points.draw;
            }
          });
        const sorted = sortStandings(rows, settings.tieBreakers);
        sorted.forEach((row, index) => {
          if (index < settings.qualifiersPerGroup) row.status = "qualifies";
          else if (
            index <
            settings.qualifiersPerGroup + settings.bestSecondPlaceCount + settings.bestThirdPlaceCount
          ) {
            row.status = "playoff";
          }
        });
        standings.push(...sorted);
      });
    } else if (phase.type === "league" && phase.leagueSettings) {
      const rows = activeTeams.map((team) => ({
        teamId: team.id,
        phaseId: phase.id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        status: "eliminated" as const,
      }));
      const rowById = Object.fromEntries(rows.map((row) => [row.teamId, row]));
      matches
        .filter((match) => match.phaseId === phase.id && match.played)
        .forEach((match) => {
          const home = rowById[match.teamA];
          const away = rowById[match.teamB];
          if (!home || !away) return;
          home.played += 1;
          away.played += 1;
          home.goalsFor += match.scoreA;
          home.goalsAgainst += match.scoreB;
          away.goalsFor += match.scoreB;
          away.goalsAgainst += match.scoreA;
          if (match.scoreA > match.scoreB) {
            home.wins += 1;
            away.losses += 1;
            home.points += phase.leagueSettings!.points.win;
            away.points += phase.leagueSettings!.points.loss;
          } else if (match.scoreB > match.scoreA) {
            away.wins += 1;
            home.losses += 1;
            away.points += phase.leagueSettings!.points.win;
            home.points += phase.leagueSettings!.points.loss;
          } else {
            home.draws += 1;
            away.draws += 1;
            home.points += phase.leagueSettings!.points.draw;
            away.points += phase.leagueSettings!.points.draw;
          }
        });
      const sorted = sortStandings(rows, phase.leagueSettings.tieBreakers);
      sorted.forEach((row, index) => {
        if (index < phase.leagueSettings!.playoffSpots) row.status = "qualifies";
      });
      standings.push(...sorted);
    } else if (phase.type === "swiss" && phase.swissSettings) {
      const rows = activeTeams.map((team) => ({
        teamId: team.id,
        phaseId: phase.id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        status: "eliminated" as const,
      }));
      const rowById = Object.fromEntries(rows.map((row) => [row.teamId, row]));
      matches
        .filter((match) => match.phaseId === phase.id)
        .forEach((match) => {
          const home = rowById[match.teamA];
          if (!home) return;
          if (match.isBye) {
            home.played += 1;
            home.wins += 1;
            home.points += phase.swissSettings!.points.win;
            return;
          }
          if (!match.played) return;
          const away = rowById[match.teamB];
          if (!away) return;
          home.played += 1;
          away.played += 1;
          home.goalsFor += match.scoreA;
          home.goalsAgainst += match.scoreB;
          away.goalsFor += match.scoreB;
          away.goalsAgainst += match.scoreA;
          if (match.scoreA > match.scoreB) {
            home.wins += 1;
            away.losses += 1;
            home.points += phase.swissSettings!.points.win;
            away.points += phase.swissSettings!.points.loss;
          } else if (match.scoreB > match.scoreA) {
            away.wins += 1;
            home.losses += 1;
            away.points += phase.swissSettings!.points.win;
            home.points += phase.swissSettings!.points.loss;
          } else {
            home.draws += 1;
            away.draws += 1;
            home.points += phase.swissSettings!.points.draw;
            away.points += phase.swissSettings!.points.draw;
          }
        });
      standings.push(...sortStandings(rows, phase.swissSettings.tieBreakers));
    }
  });
  return standings;
}

function getQualifiedTeams(phases: Phase[], standings: StandingRow[], teams: Team[], participantCount: number, index: number) {
  const previous = phases[index - 1];
  if (!previous) return teams.slice(0, participantCount).map((team) => team.id);
  const previousRows = standings.filter((row) => row.phaseId === previous.id);
  if (previous.type === "groups") return previousRows.filter((row) => row.status !== "eliminated").map((row) => row.teamId);
  if (previous.type === "league" && previous.leagueSettings) return previousRows.slice(0, previous.leagueSettings.playoffSpots).map((row) => row.teamId);
  if (previous.type === "swiss") return previousRows.slice(0, Math.max(4, Math.floor(previousRows.length / 2))).map((row) => row.teamId);
  return teams.slice(0, participantCount).map((team) => team.id);
}

function generateMatches(phases: Phase[], teams: Team[], participantCount: number, standings: StandingRow[]) {
  const matches: Match[] = [];
  phases.forEach((phase, index) => {
    if (phase.type === "groups" && phase.groupSettings) {
      (phase.groupAssignments ?? []).forEach((group, groupIndex) => {
        matches.push(...buildRoundRobinMatches(group, phase.id, groupIndex, `Group ${String.fromCharCode(65 + groupIndex)}`));
      });
    } else if (phase.type === "league") {
      matches.push(...buildRoundRobinMatches(teams.slice(0, participantCount).map((team) => team.id), phase.id, undefined, "League"));
    } else if (phase.type === "swiss" && phase.swissSettings) {
      const teamIds = teams.slice(0, participantCount).map((team) => team.id);
      for (let round = 0; round < phase.swissSettings.rounds; round += 1) {
        for (let pair = 0; pair < teamIds.length; pair += 2) {
          const teamA = teamIds[pair] ?? "";
          const teamB = teamIds[pair + 1] ?? "";
          matches.push({
            id: `${phase.id}-swiss-${round}-${pair / 2}`,
            phaseId: phase.id,
            roundLabel: `Swiss Round ${round + 1}`,
            teamA,
            teamB,
            scoreA: teamA && !teamB ? 1 : 0,
            scoreB: 0,
            played: Boolean(teamA && !teamB),
            isBye: Boolean(teamA && !teamB),
          });
        }
      }
    } else if (phase.type === "knockout" && phase.knockoutSettings) {
      const seededTeams = getQualifiedTeams(phases, standings, teams, participantCount, index);
      const bracketSize = phase.knockoutSettings.allowByes ? nextPowerOfTwo(Math.max(seededTeams.length, 2)) : seededTeams.length;
      const field = [...seededTeams];
      while (field.length < bracketSize) field.push("");
      for (let pair = 0; pair < field.length; pair += 2) {
        const teamA = field[pair] ?? "";
        const teamB = field[pair + 1] ?? "";
        const isBye = Boolean(teamA && !teamB) || Boolean(!teamA && teamB);
        matches.push({
          id: `${phase.id}-bracket-${pair / 2}`,
          phaseId: phase.id,
          roundLabel: `Round 1 · Match ${pair / 2 + 1}`,
          teamA,
          teamB,
          scoreA: teamA && !teamB ? 1 : 0,
          scoreB: !teamA && teamB ? 1 : 0,
          played: isBye,
          isBye,
        });
      }
    }
  });
  return matches;
}

function initializePhases(phases: Phase[], teams: Team[], participantCount: number) {
  return phases.map((phase, index) => ({
    ...phase,
    estimatedTeams: estimateIncomingTeams(phases, participantCount, index),
    groupAssignments: phase.type === "groups" ? phase.groupAssignments ?? generateGroupAssignments(phase, teams, participantCount) : undefined,
  }));
}

const seededTeams = ensureTeamCount(initialTeams, initialInfo.participantCount);
const seededPhases = initializePhases(initialPhases, seededTeams, initialInfo.participantCount);
const seededStandings = computeStandings(seededPhases, [], seededTeams, initialInfo.participantCount);
const seededMatches = generateMatches(seededPhases, seededTeams, initialInfo.participantCount, seededStandings);

export const useTournamentStore = create<TournamentState>((set) => ({
  info: initialInfo,
  phases: seededPhases,
  teams: seededTeams,
  matches: seededMatches,
  standings: computeStandings(seededPhases, seededMatches, seededTeams, initialInfo.participantCount),
  currentPhaseId: seededPhases[0]?.id ?? "",
  wizardStep: 0,
  hasStarted: false,
  settingsLocked: false,
  validationWarnings: buildWarnings(initialInfo, seededPhases, seededTeams),
  updateInfo: (payload) => set({ info: payload }),
  setWizardStep: (step) => set({ wizardStep: step }),
  addPhase: (type) =>
    set((state) => {
      const phases = initializePhases([...state.phases, createDefaultPhase(type, state.phases, state.info.participantCount)], state.teams, state.info.participantCount);
      return { phases, validationWarnings: buildWarnings(state.info, phases, state.teams) };
    }),
  removePhase: (phaseId) =>
    set((state) => {
      const phases = initializePhases(state.phases.filter((phase) => phase.id !== phaseId), state.teams, state.info.participantCount);
      return {
        phases,
        currentPhaseId: phases[0]?.id ?? "",
        validationWarnings: buildWarnings(state.info, phases, state.teams),
      };
    }),
  movePhase: (phaseId, direction) =>
    set((state) => {
      const index = state.phases.findIndex((phase) => phase.id === phaseId);
      if (index === -1) return state;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= state.phases.length) return state;
      const phases = initializePhases(moveItem(state.phases, index, target), state.teams, state.info.participantCount);
      return { phases, validationWarnings: buildWarnings(state.info, phases, state.teams) };
    }),
  updatePhaseName: (phaseId, name) =>
    set((state) => ({
      phases: state.phases.map((phase) => (phase.id === phaseId ? { ...phase, name } : phase)),
    })),
  updatePhase: (phaseId, updater) =>
    set((state) => {
      const phases = initializePhases(state.phases.map((phase) => (phase.id === phaseId ? updater(phase) : phase)), state.teams, state.info.participantCount);
      return { phases, validationWarnings: buildWarnings(state.info, phases, state.teams) };
    }),
  setParticipantCount: (count) =>
    set((state) => {
      const participantCount = Math.max(2, count);
      const teams = ensureTeamCount(state.teams, participantCount);
      const info = { ...state.info, participantCount };
      const phases = initializePhases(state.phases, teams, participantCount);
      return { info, teams, phases, validationWarnings: buildWarnings(info, phases, teams) };
    }),
  addTeam: () =>
    set((state) => {
      const teams = [...state.teams, createTeam(state.teams.length)];
      const info = { ...state.info, participantCount: teams.length };
      const phases = initializePhases(state.phases, teams, teams.length);
      return { teams, info, phases, validationWarnings: buildWarnings(info, phases, teams) };
    }),
  updateTeam: (teamId, updater) =>
    set((state) => ({
      teams: state.teams.map((team) => (team.id === teamId ? updater(team) : team)),
    })),
  randomizeGroups: (phaseId) =>
    set((state) => {
      const phases = state.phases.map((phase) =>
        phase.id === phaseId ? { ...phase, groupAssignments: generateGroupAssignments(phase, state.teams, state.info.participantCount) } : phase,
      );
      return { phases, validationWarnings: buildWarnings(state.info, phases, state.teams) };
    }),
  moveTeamBetweenGroups: (phaseId, fromGroupIndex, teamId, direction) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId || !phase.groupAssignments || !phase.groupSettings) return phase;
        const targetIndex = direction === "left" ? fromGroupIndex - 1 : fromGroupIndex + 1;
        if (targetIndex < 0 || targetIndex >= phase.groupAssignments.length) return phase;
        const assignments = phase.groupAssignments.map((group) => [...group]);
        if (assignments[targetIndex].length >= phase.groupSettings.teamsPerGroup) return phase;
        assignments[fromGroupIndex] = assignments[fromGroupIndex].filter((entry) => entry !== teamId);
        assignments[targetIndex].push(teamId);
        return { ...phase, groupAssignments: assignments };
      });
      return { phases, validationWarnings: buildWarnings(state.info, phases, state.teams) };
    }),
  startTournament: () =>
    set((state) => {
      const phases = initializePhases(state.phases, state.teams, state.info.participantCount);
      const blankStandings = computeStandings(phases, [], state.teams, state.info.participantCount);
      const matches = generateMatches(phases, state.teams, state.info.participantCount, blankStandings);
      return {
        hasStarted: true,
        settingsLocked: true,
        phases,
        matches,
        standings: computeStandings(phases, matches, state.teams, state.info.participantCount),
        currentPhaseId: phases[0]?.id ?? "",
        validationWarnings: buildWarnings(state.info, phases, state.teams),
      };
    }),
  unlockSettings: () => set({ settingsLocked: false }),
  relockSettings: () => set({ settingsLocked: true }),
  updateMatchScore: (matchId, scoreA, scoreB) =>
    set((state) => {
      const matches = state.matches.map((match) => (match.id === matchId ? { ...match, scoreA, scoreB, played: true } : match));
      const standings = computeStandings(state.phases, matches, state.teams, state.info.participantCount);
      const regenerated = generateMatches(state.phases, state.teams, state.info.participantCount, standings);
      const updatedMatches = regenerated.map((generatedMatch) => {
        const existing = matches.find((match) => match.id === generatedMatch.id);
        return existing ? { ...generatedMatch, scoreA: existing.scoreA, scoreB: existing.scoreB, played: existing.played } : generatedMatch;
      });
      return {
        matches: updatedMatches,
        standings: computeStandings(state.phases, updatedMatches, state.teams, state.info.participantCount),
      };
    }),
}));
