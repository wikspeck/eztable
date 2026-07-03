import { create } from "zustand";
import { defaultTieBreakers, initialInfo, initialPhases, initialTeams } from "@/lib/sample-data";
import type {
  BuiltInTieBreakerKey,
  CustomColumn,
  CustomColumnType,
  CustomColumnValue,
  Match,
  Phase,
  PhaseType,
  RankingDirection,
  StandingRow,
  Team,
  TieBreakerRule,
  TournamentInfo,
} from "@/lib/types";

type SetupStep = "info" | "participants" | "teams" | "phases" | "rules" | "seeding" | "review" | "start";

interface StepValidation {
  valid: boolean;
  message?: string;
}

interface TournamentState {
  info: TournamentInfo;
  teams: Team[];
  phases: Phase[];
  matches: Match[];
  standings: StandingRow[];
  currentPhaseId: string;
  currentStep: SetupStep;
  hasStarted: boolean;
  settingsLocked: boolean;
  validationWarnings: string[];
  stepValidations: Record<SetupStep, StepValidation>;
  updateInfo: (payload: TournamentInfo) => void;
  setCurrentStep: (step: SetupStep) => void;
  setParticipantCount: (count: number) => void;
  addTeam: () => void;
  updateTeam: (teamId: string, updater: (team: Team) => Team) => void;
  addPhase: (type: PhaseType) => void;
  removePhase: (phaseId: string) => void;
  movePhase: (phaseId: string, direction: "up" | "down") => void;
  updatePhaseName: (phaseId: string, name: string) => void;
  updatePhase: (phaseId: string, updater: (phase: Phase) => Phase) => void;
  randomizeGroups: (phaseId: string) => void;
  moveTeamBetweenGroups: (phaseId: string, fromGroupIndex: number, teamId: string, direction: "left" | "right") => void;
  addCustomColumn: (phaseId: string, type: CustomColumnType) => void;
  updateCustomColumn: (phaseId: string, columnId: string, updater: (column: CustomColumn) => CustomColumn) => void;
  removeCustomColumn: (phaseId: string, columnId: string) => void;
  moveTieBreaker: (phaseId: string, tieBreakerId: string, direction: "up" | "down") => void;
  toggleTieBreaker: (phaseId: string, tieBreakerId: string) => void;
  addCustomTieBreaker: (phaseId: string, columnId: string) => void;
  startTournament: () => void;
  unlockSettings: () => void;
  relockSettings: () => void;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number) => void;
}

const orderedSteps: SetupStep[] = ["info", "participants", "teams", "phases", "rules", "seeding", "review", "start"];
const colorPalette = ["#1769ff", "#16a34a", "#f59e0b", "#dc2626", "#0f172a", "#7c3aed", "#0891b2", "#ea580c"];

function createTeam(index: number): Team {
  return {
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    logo: "",
    color: colorPalette[index % colorPalette.length],
    abbreviation: `T${index + 1}`,
  };
}

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

function createCustomColumn(type: CustomColumnType, index: number): CustomColumn {
  const numeric = type === "number" || type === "percentage";
  return {
    id: `custom-column-${Date.now()}-${index}`,
    name: numeric ? `Custom metric ${index + 1}` : `Custom field ${index + 1}`,
    type,
    entryMode: "manual",
    affectsRanking: numeric,
    rankingDirection: numeric ? "higher" : undefined,
    addsToPoints: false,
    defaultValue: type === "boolean" ? false : type === "text" ? "" : 0,
  };
}

function estimatePhaseOutput(phase: Phase, inputTeams: number) {
  if (phase.type === "groups" && phase.groupSettings) {
    return Math.min(
      inputTeams,
      phase.groupSettings.groupCount * phase.groupSettings.qualifiersPerGroup +
        phase.groupSettings.bestSecondPlaceCount +
        phase.groupSettings.bestThirdPlaceCount,
    );
  }
  if (phase.type === "league" && phase.leagueSettings) {
    return Math.min(inputTeams, Math.max(phase.leagueSettings.playoffSpots, 2));
  }
  if (phase.type === "swiss" && phase.swissSettings) {
    return Math.min(inputTeams, Math.max(2, phase.swissSettings.advancingTeams));
  }
  if (phase.type === "knockout") {
    return Math.min(inputTeams, 1);
  }
  return inputTeams;
}

function initializePhases(phases: Phase[], participantCount: number, teams: Team[]) {
  let inputTeams = participantCount;
  return phases.map((phase) => {
    const outputTeams = estimatePhaseOutput(phase, inputTeams);
    const nextPhase: Phase = {
      ...phase,
      inputTeams,
      outputTeams,
      estimatedTeams: inputTeams,
      groupAssignments:
        phase.type === "groups"
          ? phase.groupAssignments ?? generateGroupAssignments(phase, teams.slice(0, participantCount))
          : undefined,
      knockoutSettings:
        phase.type === "knockout" && phase.knockoutSettings
          ? { ...phase.knockoutSettings, expectedTeams: inputTeams }
          : phase.knockoutSettings,
    };
    inputTeams = outputTeams;
    return nextPhase;
  });
}

function createPhase(type: PhaseType, phases: Phase[], participantCount: number): Phase {
  const inputTeams = phases.length === 0 ? participantCount : phases[phases.length - 1].outputTeams ?? participantCount;
  if (type === "groups") {
    const groups = Math.max(1, Math.min(inputTeams, Math.ceil(inputTeams / 4)));
    const teamsPerGroup = Math.max(2, Math.ceil(inputTeams / groups));
    return {
      id: `phase-groups-${Date.now()}`,
      name: "Group Stage",
      type,
      inputTeams,
      outputTeams: inputTeams,
      groupSettings: {
        groupCount: groups,
        teamsPerGroup,
        allowUnevenGroups: inputTeams % groups !== 0,
        assignment: "automatic",
        doubleRoundRobin: false,
        homeAway: false,
        qualifiersPerGroup: Math.min(2, teamsPerGroup),
        bestSecondPlaceCount: 0,
        bestThirdPlaceCount: 0,
        points: { win: 3, draw: 1, loss: 0 },
        tieBreakers: defaultTieBreakers(),
        customColumns: [],
      },
    };
  }
  if (type === "league") {
    return {
      id: `phase-league-${Date.now()}`,
      name: "League Phase",
      type,
      inputTeams,
      outputTeams: Math.min(inputTeams, Math.max(2, Math.min(4, inputTeams))),
      leagueSettings: {
        rounds: 1,
        homeAway: false,
        promotion: 0,
        relegation: 0,
        playoffSpots: Math.min(4, inputTeams),
        points: { win: 3, draw: 1, loss: 0 },
        tieBreakers: defaultTieBreakers(),
        customColumns: [],
      },
    };
  }
  if (type === "swiss") {
    return {
      id: `phase-swiss-${Date.now()}`,
      name: "Swiss Phase",
      type,
      inputTeams,
      outputTeams: Math.max(2, Math.floor(inputTeams / 2)),
      swissSettings: {
        rounds: Math.max(2, Math.ceil(Math.log2(Math.max(inputTeams, 2)))),
        pairing: "Standard Swiss",
        noRematches: true,
        allowByes: inputTeams % 2 !== 0,
        byeHandling: "Lowest ranked",
        points: { win: 3, draw: 1, loss: 0 },
        tieBreakers: defaultTieBreakers(),
        customColumns: [],
        advancingTeams: Math.max(2, Math.floor(inputTeams / 2)),
      },
    };
  }
  return {
    id: `phase-knockout-${Date.now()}`,
    name: "Knockout Phase",
    type,
    inputTeams,
    outputTeams: 1,
    knockoutSettings: {
      format: "Single Elimination",
      bestOf: 1,
      thirdPlaceMatch: false,
      allowByes: !isPowerOfTwo(inputTeams),
      seeding: "Ranked",
      expectedTeams: inputTeams,
    },
  };
}

function generateGroupAssignments(phase: Phase, teams: Team[]) {
  if (!phase.groupSettings) return [];
  const assignments = Array.from({ length: phase.groupSettings.groupCount }, () => [] as string[]);
  shuffle(teams.map((team) => team.id)).forEach((teamId, index) => {
    assignments[index % assignments.length].push(teamId);
  });
  return assignments;
}

function clampPhaseSettings(phase: Phase) {
  if (phase.groupSettings) {
    const inputTeams = phase.inputTeams ?? 0;
    const groupCount = Math.max(1, Math.min(phase.groupSettings.groupCount, inputTeams || 1));
    const allowUnevenGroups = phase.groupSettings.allowUnevenGroups;
    const maxTeamsPerGroup = Math.max(1, Math.ceil(inputTeams / groupCount));
    const minTeamsPerGroup = allowUnevenGroups ? Math.max(1, Math.floor(inputTeams / groupCount)) : maxTeamsPerGroup;
    const teamsPerGroup = Math.max(minTeamsPerGroup, Math.min(phase.groupSettings.teamsPerGroup, maxTeamsPerGroup));
    const qualifiersPerGroup = Math.max(0, Math.min(phase.groupSettings.qualifiersPerGroup, teamsPerGroup));
    const maxBestSecond = Math.max(0, groupCount - qualifiersPerGroup);
    const bestSecondPlaceCount = Math.max(0, Math.min(phase.groupSettings.bestSecondPlaceCount, maxBestSecond));
    const maxBestThird = teamsPerGroup >= 3 ? Math.max(0, groupCount) : 0;
    const bestThirdPlaceCount = Math.max(0, Math.min(phase.groupSettings.bestThirdPlaceCount, maxBestThird));
    return {
      ...phase,
      groupSettings: {
        ...phase.groupSettings,
        groupCount,
        teamsPerGroup,
        qualifiersPerGroup,
        bestSecondPlaceCount,
        bestThirdPlaceCount,
      },
    };
  }
  if (phase.leagueSettings) {
    const playoffSpots = Math.max(2, Math.min(phase.leagueSettings.playoffSpots, phase.inputTeams ?? phase.leagueSettings.playoffSpots));
    return { ...phase, leagueSettings: { ...phase.leagueSettings, playoffSpots } };
  }
  if (phase.swissSettings) {
    const inputTeams = phase.inputTeams ?? 2;
    const advancingTeams = Math.max(2, Math.min(phase.swissSettings.advancingTeams, inputTeams));
    const rounds = Math.max(1, Math.min(phase.swissSettings.rounds, inputTeams + Number(phase.swissSettings.allowByes)));
    return { ...phase, swissSettings: { ...phase.swissSettings, advancingTeams, rounds } };
  }
  if (phase.knockoutSettings) {
    return {
      ...phase,
      knockoutSettings: {
        ...phase.knockoutSettings,
        expectedTeams: phase.inputTeams,
      },
    };
  }
  return phase;
}

function customTieBreakerRules(columns: CustomColumn[]) {
  return columns
    .filter((column) => column.type === "number" || column.type === "percentage")
    .map<TieBreakerRule>((column) => ({
      id: `tb-custom-${column.id}`,
      label: column.name,
      key: `custom:${column.id}`,
      enabled: Boolean(column.affectsRanking),
    }));
}

function syncTieBreakers(phase: Phase) {
  if (phase.groupSettings) {
    const customRules = customTieBreakerRules(phase.groupSettings.customColumns);
    const existing = phase.groupSettings.tieBreakers.filter((rule) => !String(rule.key).startsWith("custom:"));
    return { ...phase, groupSettings: { ...phase.groupSettings, tieBreakers: [...existing, ...customRules] } };
  }
  if (phase.leagueSettings) {
    const customRules = customTieBreakerRules(phase.leagueSettings.customColumns);
    const existing = phase.leagueSettings.tieBreakers.filter((rule) => !String(rule.key).startsWith("custom:"));
    return { ...phase, leagueSettings: { ...phase.leagueSettings, tieBreakers: [...existing, ...customRules] } };
  }
  if (phase.swissSettings) {
    const customRules = customTieBreakerRules(phase.swissSettings.customColumns);
    const existing = phase.swissSettings.tieBreakers.filter((rule) => !String(rule.key).startsWith("custom:"));
    return { ...phase, swissSettings: { ...phase.swissSettings, tieBreakers: [...existing, ...customRules] } };
  }
  return phase;
}

function phaseColumns(phase: Phase) {
  return phase.groupSettings?.customColumns ?? phase.leagueSettings?.customColumns ?? phase.swissSettings?.customColumns ?? [];
}

function phaseTieBreakers(phase: Phase) {
  return phase.groupSettings?.tieBreakers ?? phase.leagueSettings?.tieBreakers ?? phase.swissSettings?.tieBreakers ?? [];
}

function defaultCustomValues(columns: CustomColumn[]) {
  return Object.fromEntries(columns.map((column) => [column.id, column.defaultValue ?? (column.type === "boolean" ? false : column.type === "text" ? "" : 0)]));
}

function getTieBreakerValue(rule: TieBreakerRule, row: StandingRow, headToHeadRank = 0) {
  if (rule.key === "points") return row.points;
  if (rule.key === "goalDifference") return row.goalsFor - row.goalsAgainst;
  if (rule.key === "goalsScored") return row.goalsFor;
  if (rule.key === "goalsConceded") return row.goalsAgainst;
  if (rule.key === "wins") return row.wins;
  if (rule.key === "headToHead") return headToHeadRank;
  if (String(rule.key).startsWith("custom:")) {
    const id = String(rule.key).slice("custom:".length);
    return row.customValues[id];
  }
  return 0;
}

function sortStandings(rows: StandingRow[], tieBreakers: TieBreakerRule[], columns: CustomColumn[]) {
  return [...rows].sort((left, right) => {
    for (const rule of tieBreakers.filter((entry) => entry.enabled)) {
      const leftValue = getTieBreakerValue(rule, left);
      const rightValue = getTieBreakerValue(rule, right);
      if (leftValue === rightValue) continue;
      const customColumn = String(rule.key).startsWith("custom:")
        ? columns.find((column) => `custom:${column.id}` === rule.key)
        : undefined;
      const lowerWins = rule.key === "goalsConceded" || customColumn?.rankingDirection === "lower";
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return lowerWins ? leftValue - rightValue : rightValue - leftValue;
      }
    }
    return left.teamId.localeCompare(right.teamId);
  });
}

function computeStandings(phases: Phase[], matches: Match[], teams: Team[], participantCount: number) {
  const standings: StandingRow[] = [];
  const participantTeams = teams.slice(0, participantCount);
  phases.forEach((phase) => {
    const columns = phaseColumns(phase);
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
          customValues: defaultCustomValues(columns),
          status: "eliminated" as const,
        }));
        const rowById = Object.fromEntries(rows.map((row) => [row.teamId, row]));
        matches
          .filter((match) => match.phaseId === phase.id && match.groupIndex === groupIndex && match.played)
          .forEach((match) => {
            const left = rowById[match.teamA];
            const right = rowById[match.teamB];
            if (!left || !right) return;
            left.played += 1;
            right.played += 1;
            left.goalsFor += match.scoreA;
            left.goalsAgainst += match.scoreB;
            right.goalsFor += match.scoreB;
            right.goalsAgainst += match.scoreA;
            if (match.scoreA > match.scoreB) {
              left.wins += 1;
              right.losses += 1;
              left.points += settings.points.win;
              right.points += settings.points.loss;
            } else if (match.scoreB > match.scoreA) {
              right.wins += 1;
              left.losses += 1;
              right.points += settings.points.win;
              left.points += settings.points.loss;
            } else {
              left.draws += 1;
              right.draws += 1;
              left.points += settings.points.draw;
              right.points += settings.points.draw;
            }
            columns.forEach((column) => {
              if (column.addsToPoints && typeof column.defaultValue === "number") {
                left.points += column.defaultValue;
                right.points += column.defaultValue;
              }
            });
          });
        const sorted = sortStandings(rows, settings.tieBreakers, columns);
        sorted.forEach((row, index) => {
          if (index < settings.qualifiersPerGroup) row.status = "qualifies";
          else if (index < settings.qualifiersPerGroup + settings.bestSecondPlaceCount + settings.bestThirdPlaceCount) row.status = "playoff";
        });
        standings.push(...sorted);
      });
    } else if (phase.type === "league" && phase.leagueSettings) {
      const settings = phase.leagueSettings;
      const rows = participantTeams.map((team) => ({
        teamId: team.id,
        phaseId: phase.id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        customValues: defaultCustomValues(columns),
        status: "eliminated" as const,
      }));
      const rowById = Object.fromEntries(rows.map((row) => [row.teamId, row]));
      matches
        .filter((match) => match.phaseId === phase.id && match.played)
        .forEach((match) => {
          const left = rowById[match.teamA];
          const right = rowById[match.teamB];
          if (!left || !right) return;
          left.played += 1;
          right.played += 1;
          left.goalsFor += match.scoreA;
          left.goalsAgainst += match.scoreB;
          right.goalsFor += match.scoreB;
          right.goalsAgainst += match.scoreA;
          if (match.scoreA > match.scoreB) {
            left.wins += 1;
            right.losses += 1;
            left.points += settings.points.win;
            right.points += settings.points.loss;
          } else if (match.scoreB > match.scoreA) {
            right.wins += 1;
            left.losses += 1;
            right.points += settings.points.win;
            left.points += settings.points.loss;
          } else {
            left.draws += 1;
            right.draws += 1;
            left.points += settings.points.draw;
            right.points += settings.points.draw;
          }
        });
      const sorted = sortStandings(rows, settings.tieBreakers, columns);
      sorted.forEach((row, index) => {
        if (index < settings.playoffSpots) row.status = "qualifies";
      });
      standings.push(...sorted);
    } else if (phase.type === "swiss" && phase.swissSettings) {
      const settings = phase.swissSettings;
      const rows = participantTeams.map((team) => ({
        teamId: team.id,
        phaseId: phase.id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        customValues: defaultCustomValues(columns),
        status: "eliminated" as const,
      }));
      const rowById = Object.fromEntries(rows.map((row) => [row.teamId, row]));
      matches
        .filter((match) => match.phaseId === phase.id)
        .forEach((match) => {
          const left = rowById[match.teamA];
          if (!left) return;
          if (match.isBye) {
            left.played += 1;
            left.wins += 1;
            left.points += settings.points.win;
            return;
          }
          if (!match.played) return;
          const right = rowById[match.teamB];
          if (!right) return;
          left.played += 1;
          right.played += 1;
          left.goalsFor += match.scoreA;
          left.goalsAgainst += match.scoreB;
          right.goalsFor += match.scoreB;
          right.goalsAgainst += match.scoreA;
          if (match.scoreA > match.scoreB) {
            left.wins += 1;
            right.losses += 1;
            left.points += settings.points.win;
            right.points += settings.points.loss;
          } else if (match.scoreB > match.scoreA) {
            right.wins += 1;
            left.losses += 1;
            right.points += settings.points.win;
            left.points += settings.points.loss;
          } else {
            left.draws += 1;
            right.draws += 1;
            left.points += settings.points.draw;
            right.points += settings.points.draw;
          }
        });
      const sorted = sortStandings(rows, settings.tieBreakers, columns);
      sorted.forEach((row, index) => {
        if (index < settings.advancingTeams) row.status = "qualifies";
      });
      standings.push(...sorted);
    }
  });
  return standings;
}

function getAdvancingTeams(phases: Phase[], standings: StandingRow[], teams: Team[], participantCount: number, phaseIndex: number) {
  const previous = phases[phaseIndex - 1];
  if (!previous) return teams.slice(0, participantCount).map((team) => team.id);
  const rows = standings.filter((row) => row.phaseId === previous.id);
  if (previous.type === "groups") return rows.filter((row) => row.status !== "eliminated").map((row) => row.teamId);
  if (previous.type === "league" && previous.leagueSettings) return rows.slice(0, previous.leagueSettings.playoffSpots).map((row) => row.teamId);
  if (previous.type === "swiss" && previous.swissSettings) return rows.slice(0, previous.swissSettings.advancingTeams).map((row) => row.teamId);
  return teams.slice(0, participantCount).map((team) => team.id);
}

function buildRoundRobinMatches(teamIds: string[], phaseId: string, groupIndex?: number, label = "Round Robin") {
  const matches: Match[] = [];
  for (let left = 0; left < teamIds.length; left += 1) {
    for (let right = left + 1; right < teamIds.length; right += 1) {
      matches.push({
        id: `${phaseId}-${groupIndex ?? "main"}-${left}-${right}`,
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

function generateMatches(phases: Phase[], teams: Team[], participantCount: number, standings: StandingRow[]) {
  const matches: Match[] = [];
  phases.forEach((phase, phaseIndex) => {
    if (phase.type === "groups" && phase.groupSettings) {
      (phase.groupAssignments ?? []).forEach((group, groupIndex) => {
        matches.push(...buildRoundRobinMatches(group, phase.id, groupIndex, `Group ${String.fromCharCode(65 + groupIndex)}`));
      });
    } else if (phase.type === "league") {
      matches.push(...buildRoundRobinMatches(teams.slice(0, participantCount).map((team) => team.id), phase.id, undefined, "League"));
    } else if (phase.type === "swiss" && phase.swissSettings) {
      const teamIds = getAdvancingTeams(phases, standings, teams, participantCount, phaseIndex);
      for (let round = 0; round < phase.swissSettings.rounds; round += 1) {
        for (let index = 0; index < teamIds.length; index += 2) {
          const teamA = teamIds[index] ?? "";
          const teamB = teamIds[index + 1] ?? "";
          const isBye = Boolean(teamA && !teamB);
          matches.push({
            id: `${phase.id}-swiss-${round}-${index / 2}`,
            phaseId: phase.id,
            roundLabel: `Swiss Round ${round + 1}`,
            teamA,
            teamB,
            scoreA: isBye ? 1 : 0,
            scoreB: 0,
            played: isBye,
            isBye,
          });
        }
      }
    } else if (phase.type === "knockout" && phase.knockoutSettings) {
      const entrants = getAdvancingTeams(phases, standings, teams, participantCount, phaseIndex);
      const bracketSize = phase.knockoutSettings.allowByes ? nextPowerOfTwo(Math.max(entrants.length, 2)) : entrants.length;
      const field = [...entrants];
      while (field.length < bracketSize) field.push("");
      for (let index = 0; index < field.length; index += 2) {
        const teamA = field[index] ?? "";
        const teamB = field[index + 1] ?? "";
        const isBye = Boolean(teamA && !teamB) || Boolean(!teamA && teamB);
        matches.push({
          id: `${phase.id}-round-1-${index / 2}`,
          phaseId: phase.id,
          roundLabel: `Round 1 · Match ${index / 2 + 1}`,
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

function buildWarnings(info: TournamentInfo, phases: Phase[], teams: Team[]) {
  const warnings: string[] = [];
  if (teams.length !== info.participantCount) warnings.push(`Participant count is ${info.participantCount}, but ${teams.length} teams are currently configured.`);

  phases.forEach((phase) => {
    const inputTeams = phase.inputTeams ?? 0;
    if (phase.groupSettings) {
      const settings = phase.groupSettings;
      if (settings.groupCount > inputTeams) warnings.push(`${phase.name}: group count cannot exceed incoming teams.`);
      if (!settings.allowUnevenGroups && inputTeams % settings.groupCount !== 0) warnings.push(`${phase.name}: uneven groups are disabled, so teams must divide evenly.`);
      if (settings.groupCount * settings.teamsPerGroup < inputTeams) warnings.push(`${phase.name}: teams per group do not fit the incoming teams.`);
      if (settings.qualifiersPerGroup > settings.teamsPerGroup) warnings.push(`${phase.name}: qualifiers per group cannot exceed group size.`);
      if (settings.bestSecondPlaceCount > 0 && settings.groupCount < 2) warnings.push(`${phase.name}: best second-place qualification needs at least two groups.`);
      if (settings.bestThirdPlaceCount > 0 && settings.teamsPerGroup < 3) warnings.push(`${phase.name}: third-place ranking requires at least three teams per group.`);
    }
    if (phase.swissSettings) {
      if (!phase.swissSettings.allowByes && inputTeams % 2 !== 0) warnings.push(`${phase.name}: odd Swiss fields require byes.`);
      if (phase.swissSettings.advancingTeams > inputTeams) warnings.push(`${phase.name}: advancing teams cannot exceed incoming teams.`);
    }
    if (phase.knockoutSettings) {
      if (!phase.knockoutSettings.allowByes && !isPowerOfTwo(inputTeams)) warnings.push(`${phase.name}: ${inputTeams} teams require byes or a power-of-two bracket.`);
      if (phase.knockoutSettings.expectedTeams && phase.knockoutSettings.expectedTeams > inputTeams && !phase.knockoutSettings.allowByes) warnings.push(`${phase.name}: expected bracket size is larger than the teams this phase receives.`);
    }
  });

  return warnings;
}

function buildStepValidations(info: TournamentInfo, teams: Team[], phases: Phase[], warnings: string[]): Record<SetupStep, StepValidation> {
  const participantTeams = teams.slice(0, info.participantCount);
  const teamsValid = participantTeams.every((team) => team.name.trim().length > 0);
  const phasesValid = phases.length > 0;
  const rulesValid = warnings.length === 0;
  const seedingValid = phases
    .filter((phase) => phase.type === "groups")
    .every((phase) => {
      const assignments = phase.groupAssignments ?? [];
      return assignments.every((group) => group.length > 0);
    });
  return {
    info: { valid: info.name.trim().length >= 3, message: "Enter a tournament name." },
    participants: { valid: info.participantCount >= 2, message: "Set at least two participants." },
    teams: { valid: teamsValid && participantTeams.length === info.participantCount, message: "Each participant slot needs a team." },
    phases: { valid: phasesValid, message: "Add at least one phase." },
    rules: { valid: rulesValid, message: warnings[0] ?? "Resolve invalid rules before continuing." },
    seeding: { valid: seedingValid, message: "Every group needs seeded teams." },
    review: { valid: rulesValid && seedingValid && teamsValid && phasesValid, message: "Complete the earlier steps first." },
    start: { valid: rulesValid && seedingValid && teamsValid && phasesValid, message: "The tournament cannot start until the setup is valid." },
  };
}

function recalcState(info: TournamentInfo, teams: Team[], phases: Phase[], keepMatches?: Match[]) {
  const normalizedTeams = ensureTeamCount(teams, info.participantCount);
  const normalizedPhases = initializePhases(phases.map(clampPhaseSettings).map(syncTieBreakers), info.participantCount, normalizedTeams);
  const warnings = buildWarnings(info, normalizedPhases, normalizedTeams);
  const stepValidations = buildStepValidations(info, normalizedTeams, normalizedPhases, warnings);
  const seedStandings = computeStandings(normalizedPhases, [], normalizedTeams, info.participantCount);
  const generatedMatches = generateMatches(normalizedPhases, normalizedTeams, info.participantCount, seedStandings);
  const matches =
    keepMatches && keepMatches.length > 0
      ? generatedMatches.map((generated) => {
          const existing = keepMatches.find((match) => match.id === generated.id);
          return existing ? { ...generated, scoreA: existing.scoreA, scoreB: existing.scoreB, played: existing.played } : generated;
        })
      : generatedMatches;
  const standings = computeStandings(normalizedPhases, matches, normalizedTeams, info.participantCount);
  return { info, teams: normalizedTeams, phases: normalizedPhases, validationWarnings: warnings, stepValidations, matches, standings };
}

const seeded = recalcState(initialInfo, initialTeams, initialPhases);

export const useTournamentStore = create<TournamentState>((set) => ({
  info: seeded.info,
  teams: seeded.teams,
  phases: seeded.phases,
  matches: seeded.matches,
  standings: seeded.standings,
  currentPhaseId: seeded.phases[0]?.id ?? "",
  currentStep: "info",
  hasStarted: false,
  settingsLocked: false,
  validationWarnings: seeded.validationWarnings,
  stepValidations: seeded.stepValidations,
  updateInfo: (payload) => set((state) => ({ ...state, ...recalcState(payload, state.teams, state.phases, state.matches) })),
  setCurrentStep: (step) =>
    set((state) => {
      const targetIndex = orderedSteps.indexOf(step);
      const blocked = orderedSteps.slice(0, targetIndex).find((entry) => !state.stepValidations[entry].valid);
      return { currentStep: blocked ?? step };
    }),
  setParticipantCount: (count) =>
    set((state) => {
      const info = { ...state.info, participantCount: Math.max(2, count) };
      return { ...state, ...recalcState(info, state.teams, state.phases, state.matches) };
    }),
  addTeam: () =>
    set((state) => {
      const teams = [...state.teams, createTeam(state.teams.length)];
      const info = { ...state.info, participantCount: teams.length };
      return { ...state, ...recalcState(info, teams, state.phases, state.matches) };
    }),
  updateTeam: (teamId, updater) =>
    set((state) => ({ ...state, ...recalcState(state.info, state.teams.map((team) => (team.id === teamId ? updater(team) : team)), state.phases, state.matches) })),
  addPhase: (type) =>
    set((state) => {
      const phase = createPhase(type, state.phases, state.info.participantCount);
      return { ...state, ...recalcState(state.info, state.teams, [...state.phases, phase], state.matches) };
    }),
  removePhase: (phaseId) =>
    set((state) => {
      const phases = state.phases.filter((phase) => phase.id !== phaseId);
      const next = recalcState(state.info, state.teams, phases, state.matches);
      return { ...state, ...next, currentPhaseId: next.phases[0]?.id ?? "" };
    }),
  movePhase: (phaseId, direction) =>
    set((state) => {
      const index = state.phases.findIndex((phase) => phase.id === phaseId);
      if (index === -1) return state;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= state.phases.length) return state;
      return { ...state, ...recalcState(state.info, state.teams, moveItem(state.phases, index, target), state.matches) };
    }),
  updatePhaseName: (phaseId, name) =>
    set((state) => ({ ...state, ...recalcState(state.info, state.teams, state.phases.map((phase) => (phase.id === phaseId ? { ...phase, name } : phase)), state.matches) })),
  updatePhase: (phaseId, updater) =>
    set((state) => ({ ...state, ...recalcState(state.info, state.teams, state.phases.map((phase) => (phase.id === phaseId ? updater(phase) : phase)), state.matches) })),
  randomizeGroups: (phaseId) =>
    set((state) => {
      const phases = state.phases.map((phase) =>
        phase.id === phaseId ? { ...phase, groupAssignments: generateGroupAssignments(phase, state.teams.slice(0, state.info.participantCount)) } : phase,
      );
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  moveTeamBetweenGroups: (phaseId, fromGroupIndex, teamId, direction) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId || !phase.groupAssignments || !phase.groupSettings) return phase;
        const targetIndex = direction === "left" ? fromGroupIndex - 1 : fromGroupIndex + 1;
        if (targetIndex < 0 || targetIndex >= phase.groupAssignments.length) return phase;
        const assignments = phase.groupAssignments.map((group) => [...group]);
        const fromGroup = assignments[fromGroupIndex];
        const targetGroup = assignments[targetIndex];
        if (!fromGroup.includes(teamId)) return phase;
        const targetMax = Math.ceil((phase.inputTeams ?? state.info.participantCount) / phase.groupSettings.groupCount);
        if (targetGroup.length >= targetMax) return phase;
        assignments[fromGroupIndex] = fromGroup.filter((entry) => entry !== teamId);
        assignments[targetIndex] = [...targetGroup, teamId];
        return { ...phase, groupAssignments: assignments };
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  addCustomColumn: (phaseId, type) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const targetColumns = phaseColumns(phase);
        const nextColumn = createCustomColumn(type, targetColumns.length);
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, customColumns: [...phase.groupSettings.customColumns, nextColumn] } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, customColumns: [...phase.leagueSettings.customColumns, nextColumn] } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, customColumns: [...phase.swissSettings.customColumns, nextColumn] } };
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  updateCustomColumn: (phaseId, columnId, updater) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, customColumns: phase.groupSettings.customColumns.map((column) => (column.id === columnId ? updater(column) : column)) } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, customColumns: phase.leagueSettings.customColumns.map((column) => (column.id === columnId ? updater(column) : column)) } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, customColumns: phase.swissSettings.customColumns.map((column) => (column.id === columnId ? updater(column) : column)) } };
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  removeCustomColumn: (phaseId, columnId) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, customColumns: phase.groupSettings.customColumns.filter((column) => column.id !== columnId) } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, customColumns: phase.leagueSettings.customColumns.filter((column) => column.id !== columnId) } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, customColumns: phase.swissSettings.customColumns.filter((column) => column.id !== columnId) } };
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  moveTieBreaker: (phaseId, tieBreakerId, direction) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const tieBreakers = phaseTieBreakers(phase);
        const index = tieBreakers.findIndex((rule) => rule.id === tieBreakerId);
        if (index === -1) return phase;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= tieBreakers.length) return phase;
        const nextRules = moveItem(tieBreakers, index, target);
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, tieBreakers: nextRules } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, tieBreakers: nextRules } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, tieBreakers: nextRules } };
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  toggleTieBreaker: (phaseId, tieBreakerId) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const toggle = (rules: TieBreakerRule[]) => rules.map((rule) => (rule.id === tieBreakerId ? { ...rule, enabled: !rule.enabled } : rule));
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, tieBreakers: toggle(phase.groupSettings.tieBreakers) } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, tieBreakers: toggle(phase.leagueSettings.tieBreakers) } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, tieBreakers: toggle(phase.swissSettings.tieBreakers) } };
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  addCustomTieBreaker: (_phaseId, _columnId) => set((state) => state),
  startTournament: () =>
    set((state) => {
      const next = recalcState(state.info, state.teams, state.phases, state.matches);
      return {
        ...state,
        ...next,
        hasStarted: true,
        settingsLocked: true,
        currentStep: "start",
        currentPhaseId: next.phases[0]?.id ?? "",
      };
    }),
  unlockSettings: () => set({ settingsLocked: false }),
  relockSettings: () => set({ settingsLocked: true }),
  updateMatchScore: (matchId, scoreA, scoreB) =>
    set((state) => {
      const matches = state.matches.map((match) => (match.id === matchId ? { ...match, scoreA, scoreB, played: true } : match));
      const next = recalcState(state.info, state.teams, state.phases, matches);
      return { ...state, ...next };
    }),
}));
