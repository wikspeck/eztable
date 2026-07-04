import { create } from "zustand";
import { defaultTieBreakers, initialInfo, initialPhases, initialTeams } from "@/lib/sample-data";
import type {
  CustomColumn,
  CustomColumnType,
  CustomColumnValue,
  Match,
  Phase,
  PhaseType,
  StandingRow,
  Team,
  TieBreakerRule,
  TournamentInfo,
} from "@/lib/types";

type SetupStep = "info" | "participants" | "teams" | "phases" | "scoring" | "standings" | "tiebreakers" | "seeding" | "review" | "start";

export interface ValidationIssue {
  id: string;
  step: SetupStep;
  scope: "error" | "warning";
  title: string;
  message: string;
  fix: string;
  phaseId?: string;
}

interface StepValidation {
  valid: boolean;
  message: string;
  issues: ValidationIssue[];
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
  validationIssues: ValidationIssue[];
  stepValidations: Record<SetupStep, StepValidation>;
  updateInfo: (payload: TournamentInfo) => void;
  setCurrentStep: (step: SetupStep) => void;
  setCurrentPhaseId: (phaseId: string) => void;
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
  startTournament: () => void;
  unlockSettings: () => void;
  relockSettings: () => void;
  addMatch: (phaseId: string) => void;
  updateMatch: (matchId: string, updater: (match: Match) => Match) => void;
  saveMatchResult: (matchId: string) => void;
}

const orderedSteps: SetupStep[] = ["info", "participants", "teams", "phases", "scoring", "standings", "tiebreakers", "seeding", "review", "start"];
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
    showInStandings: true,
    useAsTiebreaker: false,
    rankingDirection: numeric ? "higher" : undefined,
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
  if (phase.type === "knockout") return Math.min(inputTeams, 1);
  return inputTeams;
}

function createPhase(type: PhaseType, phases: Phase[], participantCount: number): Phase {
  const inputTeams = phases.length === 0 ? participantCount : phases[phases.length - 1].outputTeams ?? participantCount;
  if (type === "groups") {
    const groups = Math.max(1, Math.min(inputTeams, Math.ceil(inputTeams / 4)));
    return {
      id: `phase-groups-${Date.now()}`,
      name: "Group Stage",
      type,
      inputTeams,
      outputTeams: inputTeams,
      groupSettings: {
        groupCount: groups,
        teamsPerGroup: Math.max(2, Math.ceil(inputTeams / groups)),
        allowUnevenGroups: inputTeams % groups !== 0,
        assignment: "automatic",
        doubleRoundRobin: false,
        homeAway: false,
        qualifiersPerGroup: Math.min(2, Math.ceil(inputTeams / groups)),
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

function phaseColumns(phase: Phase) {
  return phase.groupSettings?.customColumns ?? phase.leagueSettings?.customColumns ?? phase.swissSettings?.customColumns ?? [];
}

function phaseTieBreakers(phase: Phase) {
  return phase.groupSettings?.tieBreakers ?? phase.leagueSettings?.tieBreakers ?? phase.swissSettings?.tieBreakers ?? [];
}

function defaultCustomValues(columns: CustomColumn[]) {
  return Object.fromEntries(columns.map((column) => [column.id, column.defaultValue ?? (column.type === "boolean" ? false : column.type === "text" ? "" : 0)]));
}

function buildExtraValueKey(columnId: string, side: "A" | "B") {
  return `${columnId}:${side}`;
}

function normalizePhase(phase: Phase) {
  if (phase.groupSettings) {
    const inputTeams = Math.max(phase.inputTeams ?? 0, 1);
    const groupCount = Math.max(1, Math.min(phase.groupSettings.groupCount, inputTeams));
    const teamsPerGroup = Math.max(2, Math.min(phase.groupSettings.teamsPerGroup, inputTeams));
    const qualifiersPerGroup = Math.max(0, phase.groupSettings.qualifiersPerGroup);
    return {
      ...phase,
      groupSettings: {
        ...phase.groupSettings,
        groupCount,
        teamsPerGroup,
        qualifiersPerGroup,
        bestSecondPlaceCount: Math.max(0, phase.groupSettings.bestSecondPlaceCount),
        bestThirdPlaceCount: Math.max(0, phase.groupSettings.bestThirdPlaceCount),
      },
    };
  }
  if (phase.leagueSettings) {
    return {
      ...phase,
      leagueSettings: {
        ...phase.leagueSettings,
        rounds: Math.max(1, phase.leagueSettings.rounds),
        playoffSpots: Math.max(2, phase.leagueSettings.playoffSpots),
      },
    };
  }
  if (phase.swissSettings) {
    return {
      ...phase,
      swissSettings: {
        ...phase.swissSettings,
        rounds: Math.max(1, phase.swissSettings.rounds),
        advancingTeams: Math.max(2, phase.swissSettings.advancingTeams),
      },
    };
  }
  return phase;
}

function syncTieBreakers(phase: Phase) {
  const sync = (rules: TieBreakerRule[], columns: CustomColumn[]) => {
    const baseRules = rules.filter((rule) => !String(rule.key).startsWith("custom:"));
    const customRules = columns
      .filter((column) => (column.type === "number" || column.type === "percentage") && column.useAsTiebreaker)
      .map<TieBreakerRule>((column) => ({
        id: `tb-custom-${column.id}`,
        label: column.name || "Custom column",
        key: `custom:${column.id}`,
        enabled: false,
      }));
    return [...baseRules, ...customRules];
  };

  if (phase.groupSettings) {
    return { ...phase, groupSettings: { ...phase.groupSettings, tieBreakers: sync(phase.groupSettings.tieBreakers, phase.groupSettings.customColumns) } };
  }
  if (phase.leagueSettings) {
    return { ...phase, leagueSettings: { ...phase.leagueSettings, tieBreakers: sync(phase.leagueSettings.tieBreakers, phase.leagueSettings.customColumns) } };
  }
  if (phase.swissSettings) {
    return { ...phase, swissSettings: { ...phase.swissSettings, tieBreakers: sync(phase.swissSettings.tieBreakers, phase.swissSettings.customColumns) } };
  }
  return phase;
}

function initializePhases(phases: Phase[], participantCount: number, teams: Team[]) {
  let inputTeams = participantCount;
  return phases.map((phase) => {
    const synced = syncTieBreakers(normalizePhase(phase));
    const outputTeams = estimatePhaseOutput(synced, inputTeams);
    const nextPhase: Phase = {
      ...synced,
      inputTeams,
      outputTeams,
      estimatedTeams: inputTeams,
      groupAssignments:
        synced.type === "groups" ? synced.groupAssignments ?? generateGroupAssignments(synced, teams.slice(0, participantCount)) : undefined,
      knockoutSettings:
        synced.type === "knockout" && synced.knockoutSettings ? { ...synced.knockoutSettings, expectedTeams: inputTeams } : synced.knockoutSettings,
    };
    inputTeams = outputTeams;
    return nextPhase;
  });
}

function getTieBreakerValue(rule: TieBreakerRule, row: StandingRow) {
  if (rule.key === "points") return row.points;
  if (rule.key === "goalDifference") return row.goalsFor - row.goalsAgainst;
  if (rule.key === "goalsScored") return row.goalsFor;
  if (rule.key === "goalsConceded") return row.goalsAgainst;
  if (rule.key === "wins") return row.wins;
  if (String(rule.key).startsWith("custom:")) return row.customValues[String(rule.key).slice("custom:".length)];
  return 0;
}

function sortStandings(rows: StandingRow[], tieBreakers: TieBreakerRule[], columns: CustomColumn[]) {
  return [...rows].sort((left, right) => {
    for (const rule of tieBreakers.filter((entry) => entry.enabled)) {
      const leftValue = getTieBreakerValue(rule, left);
      const rightValue = getTieBreakerValue(rule, right);
      if (leftValue === rightValue) continue;
      const column = columns.find((entry) => `custom:${entry.id}` === rule.key);
      const lowerIsBetter = rule.key === "goalsConceded" || column?.rankingDirection === "lower";
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return lowerIsBetter ? leftValue - rightValue : rightValue - leftValue;
      }
      return String(rightValue).localeCompare(String(leftValue));
    }
    return left.teamId.localeCompare(right.teamId);
  });
}

function baseRows(teamIds: string[], phaseId: string, columns: CustomColumn[], groupIndex?: number) {
  return teamIds.map((teamId) => ({
    teamId,
    phaseId,
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
}

function applyCustomValues(row: StandingRow, match: Match, side: "A" | "B", columns: CustomColumn[]) {
  columns.forEach((column) => {
    const key = buildExtraValueKey(column.id, side);
    const value = match.extraValues?.[key];
    if (value === undefined) return;
    if (typeof value === "number" && typeof row.customValues[column.id] === "number") {
      row.customValues[column.id] = Number(row.customValues[column.id] ?? 0) + value;
      return;
    }
    row.customValues[column.id] = value;
  });
}

function computeStandings(phases: Phase[], matches: Match[], teams: Team[], participantCount: number) {
  const participantTeams = teams.slice(0, participantCount);
  const standings: StandingRow[] = [];

  phases.forEach((phase) => {
    const columns = phaseColumns(phase);

    if (phase.type === "groups" && phase.groupSettings) {
      const settings = phase.groupSettings;
      (phase.groupAssignments ?? []).forEach((group, groupIndex) => {
        const rows = baseRows(group, phase.id, columns, groupIndex);
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
            applyCustomValues(left, match, "A", columns);
            applyCustomValues(right, match, "B", columns);
          });

        const sorted = sortStandings(rows, settings.tieBreakers, columns);
        sorted.forEach((row, index) => {
          if (index < settings.qualifiersPerGroup) row.status = "qualifies";
          else if (index < settings.qualifiersPerGroup + settings.bestSecondPlaceCount + settings.bestThirdPlaceCount) row.status = "playoff";
        });
        standings.push(...sorted);
      });
      return;
    }

    const phaseTeamIds = participantTeams.map((team) => team.id);
    if ((phase.type === "league" && phase.leagueSettings) || (phase.type === "swiss" && phase.swissSettings)) {
      const rows = baseRows(phaseTeamIds, phase.id, columns);
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
          const scoring = phase.leagueSettings?.points ?? phase.swissSettings?.points;
          if (match.scoreA > match.scoreB) {
            left.wins += 1;
            right.losses += 1;
            left.points += scoring!.win;
            right.points += scoring!.loss;
          } else if (match.scoreB > match.scoreA) {
            right.wins += 1;
            left.losses += 1;
            right.points += scoring!.win;
            left.points += scoring!.loss;
          } else {
            left.draws += 1;
            right.draws += 1;
            left.points += scoring!.draw;
            right.points += scoring!.draw;
          }
          applyCustomValues(left, match, "A", columns);
          applyCustomValues(right, match, "B", columns);
        });

      const sorted = sortStandings(rows, phaseTieBreakers(phase), columns);
      const qualifyingCount = phase.leagueSettings?.playoffSpots ?? phase.swissSettings?.advancingTeams ?? 0;
      sorted.forEach((row, index) => {
        if (index < qualifyingCount) row.status = "qualifies";
      });
      standings.push(...sorted);
    }
  });

  return standings;
}

function buildRoundRobinMatches(teamIds: string[], phaseId: string, groupIndex?: number, label = "Round Robin") {
  const matches: Match[] = [];
  for (let left = 0; left < teamIds.length; left += 1) {
    for (let right = left + 1; right < teamIds.length; right += 1) {
      matches.push({
        id: `${phaseId}-${groupIndex ?? "main"}-${left}-${right}`,
        phaseId,
        roundLabel: `${label} - Match ${matches.length + 1}`,
        groupIndex,
        teamA: teamIds[left],
        teamB: teamIds[right],
        scoreA: 0,
        scoreB: 0,
        played: false,
        extraValues: {},
      });
    }
  }
  return matches;
}

function generateMatches(phases: Phase[], teams: Team[], participantCount: number) {
  const participantIds = teams.slice(0, participantCount).map((team) => team.id);
  const matches: Match[] = [];
  phases.forEach((phase) => {
    if (phase.type === "groups") {
      (phase.groupAssignments ?? []).forEach((group, groupIndex) => {
        matches.push(...buildRoundRobinMatches(group, phase.id, groupIndex, `Group ${String.fromCharCode(65 + groupIndex)}`));
      });
      return;
    }
    if (phase.type === "league") {
      matches.push(...buildRoundRobinMatches(participantIds, phase.id, undefined, "League"));
      return;
    }
    if (phase.type === "swiss" && phase.swissSettings) {
      for (let round = 0; round < phase.swissSettings.rounds; round += 1) {
        matches.push({
          id: `${phase.id}-swiss-${round}-1`,
          phaseId: phase.id,
          roundLabel: `Swiss Round ${round + 1}`,
          teamA: participantIds[0] ?? "",
          teamB: participantIds[1] ?? "",
          scoreA: 0,
          scoreB: 0,
          played: false,
          extraValues: {},
        });
      }
      return;
    }
    if (phase.type === "knockout" && phase.knockoutSettings) {
      const bracketSize = phase.knockoutSettings.allowByes ? nextPowerOfTwo(Math.max(participantIds.length, 2)) : Math.max(2, participantIds.length);
      for (let index = 0; index < bracketSize / 2; index += 1) {
        matches.push({
          id: `${phase.id}-round-1-${index + 1}`,
          phaseId: phase.id,
          roundLabel: `Round 1 - Match ${index + 1}`,
          teamA: participantIds[index * 2] ?? "",
          teamB: participantIds[index * 2 + 1] ?? "",
          scoreA: 0,
          scoreB: 0,
          played: false,
          extraValues: {},
        });
      }
    }
  });
  return matches;
}

function issue(id: string, step: SetupStep, title: string, message: string, fix: string, phaseId?: string): ValidationIssue {
  return { id, step, scope: "error", title, message, fix, phaseId };
}

function buildValidationIssues(info: TournamentInfo, phases: Phase[], teams: Team[]) {
  const issues: ValidationIssue[] = [];
  const participantTeams = teams.slice(0, info.participantCount);

  if (info.name.trim().length < 3) {
    issues.push(issue("name-short", "info", "Tournament name is too short.", "Enter at least 3 characters so the tournament can be identified clearly.", "Add a longer tournament name."));
  }
  if (info.participantCount < 2) {
    issues.push(issue("participant-min", "participants", "Too few participants.", "A tournament needs at least 2 participants.", "Increase the participant count to 2 or more."));
  }
  participantTeams.forEach((team, index) => {
    if (!team.name.trim()) {
      issues.push(issue(`team-name-${team.id}`, "teams", `Team ${index + 1} is missing a name.`, "Every participant slot needs a team name before the tournament can start.", `Enter a name for Team ${index + 1}.`));
    }
  });
  if (phases.length === 0) {
    issues.push(issue("phase-missing", "phases", "No phases configured.", "The tournament has no phase setup yet.", "Add at least one phase before continuing."));
  }

  phases.forEach((phase, index) => {
    const inputTeams = phase.inputTeams ?? 0;
    const nextPhase = phases[index + 1];
    if (phase.groupSettings) {
      const settings = phase.groupSettings;
      const minimumGroupSize = settings.allowUnevenGroups ? Math.floor(inputTeams / settings.groupCount) : Math.ceil(inputTeams / settings.groupCount);

      if (settings.groupCount > inputTeams) {
        issues.push(issue(`groups-too-many-${phase.id}`, "phases", "Too many groups.", `${settings.groupCount} groups are too many for ${inputTeams} contestants.`, "Reduce the number of groups so each group receives at least one team.", phase.id));
      }
      if (!settings.allowUnevenGroups && inputTeams % settings.groupCount !== 0) {
        issues.push(issue(`groups-uneven-${phase.id}`, "phases", "Even groups cannot be formed.", `${inputTeams} contestants cannot be split evenly into ${settings.groupCount} groups.`, "Enable uneven groups or pick a group count that divides the participant total.", phase.id));
      }
      if (settings.qualifiersPerGroup > minimumGroupSize) {
        issues.push(issue(`qualifiers-overflow-${phase.id}`, "phases", "Too many qualifiers per group.", `You cannot qualify ${settings.qualifiersPerGroup} teams from a group with only ${minimumGroupSize} teams.`, "Reduce qualifiers per group or reduce the number of groups.", phase.id));
      }
      if (settings.bestSecondPlaceCount > 0 && settings.groupCount < 2) {
        issues.push(issue(`best-second-${phase.id}`, "phases", "Best second-place ranking needs multiple groups.", "Best second-place qualification only works when there are at least 2 groups.", "Increase the number of groups or disable best second-place qualification.", phase.id));
      }
      if (settings.bestThirdPlaceCount > 0 && minimumGroupSize < 3) {
        issues.push(issue(`best-third-${phase.id}`, "phases", "Third-place ranking is not possible.", "Third-place ranking only works when groups have at least 3 teams.", "Reduce the number of groups or disable best third-place qualification.", phase.id));
      }
      if ((phase.groupAssignments ?? []).some((group) => group.length === 0)) {
        issues.push(issue(`group-empty-${phase.id}`, "seeding", "One or more groups are empty.", "Every group needs teams before the tournament can start.", "Randomize the groups again or move teams so no group is empty.", phase.id));
      }
    }

    if (phase.swissSettings) {
      if (!phase.swissSettings.allowByes && inputTeams % 2 !== 0) {
        issues.push(issue(`swiss-byes-${phase.id}`, "phases", "Swiss phase needs a bye.", `${phase.name} receives ${inputTeams} teams, which creates an odd field.`, "Enable byes or change the previous phase so an even number of teams advance.", phase.id));
      }
      if (phase.swissSettings.advancingTeams > inputTeams) {
        issues.push(issue(`swiss-advance-${phase.id}`, "phases", "Too many advancing teams.", `${phase.swissSettings.advancingTeams} teams cannot advance from a Swiss field of ${inputTeams}.`, "Reduce the advancing team count.", phase.id));
      }
    }

    if (phase.knockoutSettings) {
      const expectedSize = phase.knockoutSettings.allowByes ? nextPowerOfTwo(Math.max(inputTeams, 2)) : inputTeams;
      if (!phase.knockoutSettings.allowByes && !isPowerOfTwo(inputTeams)) {
        issues.push(issue(`knockout-size-${phase.id}`, "phases", "Knockout bracket size is invalid.", `This knockout phase needs a power-of-two field, but it currently receives ${inputTeams} teams.`, "Enable byes or change the previous phase so 2, 4, 8, 16, or 32 teams qualify.", phase.id));
      }
      if (nextPhase && nextPhase.type === "knockout" && (phase.outputTeams ?? 0) < 2) {
        issues.push(issue(`knockout-chain-${phase.id}`, "review", "Later knockout phase has no usable input.", `${phase.name} only outputs ${phase.outputTeams ?? 0} team, so the next knockout phase cannot be formed.`, "Remove the extra knockout phase or increase the number of qualifiers feeding it.", phase.id));
      }
      if (phase.knockoutSettings.expectedTeams && phase.knockoutSettings.expectedTeams > inputTeams && !phase.knockoutSettings.allowByes) {
        issues.push(issue(`knockout-preview-${phase.id}`, "review", "Bracket preview is larger than the qualified field.", `This knockout phase needs ${expectedSize} teams, but only ${inputTeams} qualify from the previous phase.`, "Enable byes or reduce the previous phase output.", phase.id));
      }
    }

    if (nextPhase?.type === "knockout" && (phase.outputTeams ?? 0) > 0 && nextPhase.knockoutSettings && !nextPhase.knockoutSettings.allowByes) {
      const qualified = phase.outputTeams ?? 0;
      if (!isPowerOfTwo(qualified)) {
        issues.push(issue(`phase-link-${phase.id}-${nextPhase.id}`, "review", "Qualification does not fit the next knockout phase.", `The next knockout phase needs 2, 4, 8, 16, or 32 teams, but only ${qualified} teams qualify from ${phase.name}.`, "Enable byes in the knockout phase or adjust how many teams qualify from the previous phase.", nextPhase.id));
      }
    }
  });

  return issues;
}

function buildStepValidations(issues: ValidationIssue[]): Record<SetupStep, StepValidation> {
  const stepIssues = (step: SetupStep) => issues.filter((entry) => entry.step === step);
  const previousStepsValid = (step: SetupStep) => orderedSteps.slice(0, orderedSteps.indexOf(step)).every((entry) => stepIssues(entry).length === 0);
  const build = (step: SetupStep, fallback: string): StepValidation => {
    const currentIssues = stepIssues(step);
    if (currentIssues.length > 0) {
      return { valid: false, message: currentIssues[0].message, issues: currentIssues };
    }
    if (!previousStepsValid(step)) {
      return {
        valid: false,
        message: "Complete the earlier setup steps first.",
        issues: [{ id: `${step}-blocked`, step, scope: "error", title: "Earlier setup is incomplete.", message: "Complete the earlier setup steps first.", fix: "Resolve the red error boxes in the earlier steps before continuing." }],
      };
    }
    return { valid: true, message: fallback, issues: [] };
  };

  return {
    info: build("info", "Tournament info is ready."),
    participants: build("participants", "Participant count is ready."),
    teams: build("teams", "Teams are ready."),
    phases: build("phases", "Phase setup is ready."),
    scoring: build("scoring", "Scoring rules are ready."),
    standings: build("standings", "Standings columns are ready."),
    tiebreakers: build("tiebreakers", "Tiebreakers are ready."),
    seeding: build("seeding", "Seeding is ready."),
    review: build("review", "Review is ready."),
    start: build("start", "The tournament can start."),
  };
}

function recalcState(info: TournamentInfo, teams: Team[], phases: Phase[], keepMatches?: Match[]) {
  const normalizedTeams = ensureTeamCount(teams, info.participantCount);
  const normalizedPhases = initializePhases(phases, info.participantCount, normalizedTeams);
  const validationIssues = buildValidationIssues(info, normalizedPhases, normalizedTeams);
  const stepValidations = buildStepValidations(validationIssues);
  const generatedMatches = generateMatches(normalizedPhases, normalizedTeams, info.participantCount);
  const matches =
    keepMatches && keepMatches.length > 0
      ? generatedMatches.map((generated) => {
          const existing = keepMatches.find((match) => match.id === generated.id);
          return existing ? { ...generated, ...existing, extraValues: existing.extraValues ?? {} } : generated;
        })
      : generatedMatches;
  const standings = computeStandings(normalizedPhases, matches, normalizedTeams, info.participantCount);
  return { info, teams: normalizedTeams, phases: normalizedPhases, validationIssues, stepValidations, matches, standings };
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
  validationIssues: seeded.validationIssues,
  stepValidations: seeded.stepValidations,
  updateInfo: (payload) => set((state) => ({ ...state, ...recalcState(payload, state.teams, state.phases, state.matches) })),
  setCurrentStep: (step) =>
    set((state) => {
      const targetIndex = orderedSteps.indexOf(step);
      const blocked = orderedSteps.slice(0, targetIndex).find((entry) => !state.stepValidations[entry].valid);
      return { currentStep: blocked ?? step };
    }),
  setCurrentPhaseId: (phaseId) => set({ currentPhaseId: phaseId }),
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
    set((state) => ({ ...state, ...recalcState(state.info, state.teams, [...state.phases, createPhase(type, state.phases, state.info.participantCount)], state.matches) })),
  removePhase: (phaseId) =>
    set((state) => {
      const phases = state.phases.filter((phase) => phase.id !== phaseId);
      const next = recalcState(state.info, state.teams, phases, state.matches);
      return { ...state, ...next, currentPhaseId: next.phases[0]?.id ?? "" };
    }),
  movePhase: (phaseId, direction) =>
    set((state) => {
      const index = state.phases.findIndex((phase) => phase.id === phaseId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= state.phases.length) return state;
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
        if (phase.id !== phaseId || !phase.groupAssignments) return phase;
        const targetIndex = direction === "left" ? fromGroupIndex - 1 : fromGroupIndex + 1;
        if (targetIndex < 0 || targetIndex >= phase.groupAssignments.length) return phase;
        const assignments = phase.groupAssignments.map((group) => [...group]);
        assignments[fromGroupIndex] = assignments[fromGroupIndex].filter((entry) => entry !== teamId);
        assignments[targetIndex] = [...assignments[targetIndex], teamId];
        return { ...phase, groupAssignments: assignments };
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  addCustomColumn: (phaseId, type) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const next = createCustomColumn(type, phaseColumns(phase).length);
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, customColumns: [...phase.groupSettings.customColumns, next] } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, customColumns: [...phase.leagueSettings.customColumns, next] } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, customColumns: [...phase.swissSettings.customColumns, next] } };
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  updateCustomColumn: (phaseId, columnId, updater) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const mapColumns = (columns: CustomColumn[]) => columns.map((column) => (column.id === columnId ? updater(column) : column));
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, customColumns: mapColumns(phase.groupSettings.customColumns) } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, customColumns: mapColumns(phase.leagueSettings.customColumns) } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, customColumns: mapColumns(phase.swissSettings.customColumns) } };
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  removeCustomColumn: (phaseId, columnId) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const filterColumns = (columns: CustomColumn[]) => columns.filter((column) => column.id !== columnId);
        const filterTieBreakers = (rules: TieBreakerRule[]) => rules.filter((rule) => rule.key !== `custom:${columnId}`);
        if (phase.groupSettings) {
          return {
            ...phase,
            groupSettings: {
              ...phase.groupSettings,
              customColumns: filterColumns(phase.groupSettings.customColumns),
              tieBreakers: filterTieBreakers(phase.groupSettings.tieBreakers),
            },
          };
        }
        if (phase.leagueSettings) {
          return {
            ...phase,
            leagueSettings: {
              ...phase.leagueSettings,
              customColumns: filterColumns(phase.leagueSettings.customColumns),
              tieBreakers: filterTieBreakers(phase.leagueSettings.tieBreakers),
            },
          };
        }
        if (phase.swissSettings) {
          return {
            ...phase,
            swissSettings: {
              ...phase.swissSettings,
              customColumns: filterColumns(phase.swissSettings.customColumns),
              tieBreakers: filterTieBreakers(phase.swissSettings.tieBreakers),
            },
          };
        }
        return phase;
      });
      return { ...state, ...recalcState(state.info, state.teams, phases, state.matches) };
    }),
  moveTieBreaker: (phaseId, tieBreakerId, direction) =>
    set((state) => {
      const phases = state.phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const rules = phaseTieBreakers(phase);
        const index = rules.findIndex((rule) => rule.id === tieBreakerId);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= rules.length) return phase;
        const moved = moveItem(rules, index, target);
        if (phase.groupSettings) return { ...phase, groupSettings: { ...phase.groupSettings, tieBreakers: moved } };
        if (phase.leagueSettings) return { ...phase, leagueSettings: { ...phase.leagueSettings, tieBreakers: moved } };
        if (phase.swissSettings) return { ...phase, swissSettings: { ...phase.swissSettings, tieBreakers: moved } };
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
  startTournament: () =>
    set((state) => {
      const next = recalcState(state.info, state.teams, state.phases, state.matches);
      return { ...state, ...next, hasStarted: true, settingsLocked: true, currentStep: "start", currentPhaseId: next.phases[0]?.id ?? "" };
    }),
  unlockSettings: () => set({ settingsLocked: false }),
  relockSettings: () => set({ settingsLocked: true }),
  addMatch: (phaseId) =>
    set((state) => {
      const phaseMatches = state.matches.filter((match) => match.phaseId === phaseId);
      const nextMatch: Match = {
        id: `${phaseId}-manual-${phaseMatches.length + 1}`,
        phaseId,
        roundLabel: `Manual Match ${phaseMatches.length + 1}`,
        teamA: state.teams[0]?.id ?? "",
        teamB: state.teams[1]?.id ?? "",
        scoreA: 0,
        scoreB: 0,
        played: false,
        extraValues: {},
      };
      return { ...state, ...recalcState(state.info, state.teams, state.phases, [...state.matches, nextMatch]) };
    }),
  updateMatch: (matchId, updater) =>
    set((state) => ({ ...state, ...recalcState(state.info, state.teams, state.phases, state.matches.map((match) => (match.id === matchId ? updater(match) : match))) })),
  saveMatchResult: (matchId) =>
    set((state) => ({ ...state, ...recalcState(state.info, state.teams, state.phases, state.matches.map((match) => (match.id === matchId ? { ...match, played: true } : match))) })),
}));
