import { create } from "zustand";
import { initialInfo, initialMatches, initialPhases, initialStandings, initialTeams } from "@/lib/sample-data";
import type { Match, Phase, StandingRow, Team, TournamentInfo } from "@/lib/types";

interface TournamentState {
  info: TournamentInfo;
  phases: Phase[];
  teams: Team[];
  matches: Match[];
  standings: StandingRow[];
  currentPhaseId: string;
  wizardStep: number;
  updateInfo: (payload: TournamentInfo) => void;
  setWizardStep: (step: number) => void;
  addPhase: (phase: Phase) => void;
  movePhase: (phaseId: string, direction: "up" | "down") => void;
  updatePhaseName: (phaseId: string, name: string) => void;
  addTeam: (team: Team) => void;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number) => void;
}

function moveItem<T>(items: T[], index: number, target: number) {
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  info: initialInfo,
  phases: initialPhases,
  teams: initialTeams,
  matches: initialMatches,
  standings: initialStandings,
  currentPhaseId: initialPhases[0].id,
  wizardStep: 0,
  updateInfo: (payload) => set({ info: payload }),
  setWizardStep: (step) => set({ wizardStep: step }),
  addPhase: (phase) =>
    set((state) => ({
      phases: [...state.phases, phase],
    })),
  movePhase: (phaseId, direction) =>
    set((state) => {
      const index = state.phases.findIndex((phase) => phase.id === phaseId);
      if (index === -1) {
        return state;
      }
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= state.phases.length) {
        return state;
      }
      return { phases: moveItem(state.phases, index, target) };
    }),
  updatePhaseName: (phaseId, name) =>
    set((state) => ({
      phases: state.phases.map((phase) => (phase.id === phaseId ? { ...phase, name } : phase)),
    })),
  addTeam: (team) =>
    set((state) => ({
      teams: [...state.teams, team],
    })),
  updateMatchScore: (matchId, scoreA, scoreB) =>
    set((state) => ({
      matches: state.matches.map((match) =>
        match.id === matchId ? { ...match, scoreA, scoreB, played: true } : match,
      ),
    })),
}));
