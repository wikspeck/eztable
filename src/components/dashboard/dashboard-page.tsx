import { useMemo, useState } from "react";
import { AlertTriangle, Download, Lock, Plus, Save, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTournamentStore } from "@/store/use-tournament-store";
import type { CustomColumn, Match, Phase, StandingRow, Team } from "@/lib/types";

const tabs = ["Overview", "Results", "Phases", "Teams", "Settings"] as const;

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const {
    info,
    phases,
    teams,
    matches,
    standings,
    currentPhaseId,
    setCurrentPhaseId,
    settingsLocked,
    hasStarted,
    unlockSettings,
    relockSettings,
    addMatch,
    updateMatch,
    saveMatchResult,
  } = useTournamentStore();

  const teamLookup = useMemo<Record<string, Team>>(() => Object.fromEntries(teams.map((team) => [team.id, team])), [teams]);
  const phaseTabs = phases.map((phase, index) => ({
    id: phase.id,
    label: phase.type === "knockout" ? "Knockout bracket" : `Phase ${index + 1} standings`,
  }));
  const currentPhase = phases.find((phase) => phase.id === currentPhaseId) ?? phases[0];
  const currentPhaseMatches = matches.filter((match) => match.phaseId === currentPhase?.id);
  const currentStandings = standings.filter((row) => row.phaseId === currentPhase?.id);
  const currentCustomColumns = (currentPhase?.groupSettings?.customColumns ?? currentPhase?.leagueSettings?.customColumns ?? currentPhase?.swissSettings?.customColumns ?? []).filter(
    (column) => column.showInStandings,
  );
  const resultColumns = currentPhase?.groupSettings?.customColumns ?? currentPhase?.leagueSettings?.customColumns ?? currentPhase?.swissSettings?.customColumns ?? [];
  const progress = Math.round((matches.filter((match) => match.played).length / Math.max(matches.length, 1)) * 100);
  const groupCount = Math.max(...currentStandings.map((row) => (row.groupIndex ?? 0) + 1), 0);

  return (
    <div className="space-y-6">
      <Card className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900">{info.name}</h2>
            <Badge tone="blue">{currentPhase?.name ?? "No active phase"}</Badge>
            <Badge tone={settingsLocked ? "red" : "yellow"}>{settingsLocked ? "Settings locked" : "Settings unlocked"}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">{info.description}</p>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
              <span>Tournament progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row lg:flex-col">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Auto-saved locally
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {hasStarted ? (
            settingsLocked ? (
              <Button variant="outline" onClick={() => unlockSettings()}>
                <Unlock className="mr-2 h-4 w-4" />
                Unlock settings
              </Button>
            ) : (
              <Button variant="outline" onClick={() => relockSettings()}>
                <Lock className="mr-2 h-4 w-4" />
                Relock settings
              </Button>
            )
          ) : null}
        </div>
      </Card>

      {!settingsLocked ? (
        <Card className="border border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">Settings are unlocked</p>
              <p className="mt-1 text-sm text-amber-800">Results stay intact here, but structural edits can change qualification paths. Relock once the structure is stable.</p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? "bg-primary text-white" : "bg-white text-slate-600 shadow-panel"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <h3 className="text-lg font-bold text-slate-900">Phase progress</h3>
            <div className="mt-5 space-y-3">
              {phases.map((phase, index) => {
                const phaseMatches = matches.filter((match) => match.phaseId === phase.id);
                const phasePlayed = phaseMatches.filter((match) => match.played).length;
                return (
                  <div key={phase.id} className="rounded-xl border border-border bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{phase.name}</p>
                        <p className="text-sm text-slate-500">
                          {phase.type} • in {phase.inputTeams ?? 0} • out {phase.outputTeams ?? 0}
                        </p>
                      </div>
                      <Badge tone={phase.id === currentPhase?.id ? "green" : "slate"}>{`Phase ${index + 1}`}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{phasePlayed} of {phaseMatches.length} results saved.</p>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-bold text-slate-900">Tournament snapshot</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatCard label="Participants" value={String(info.participantCount)} />
              <StatCard label="Phases" value={String(phases.length)} />
              <StatCard label="Matches" value={String(matches.length)} />
              <StatCard label="Completed" value={String(matches.filter((match) => match.played).length)} />
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "Results" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PhaseSelector phases={phases} currentPhaseId={currentPhase?.id ?? ""} onChange={setCurrentPhaseId} />
            <Button onClick={() => currentPhase && addMatch(currentPhase.id)}>
              <Plus className="mr-2 h-4 w-4" />
              Create match
            </Button>
          </div>
          {currentPhaseMatches.length === 0 ? (
            <EmptyState title="No matches yet" description="Create a match for this phase, then enter the score and any extra standings values." />
          ) : (
            <div className="space-y-4">
              {currentPhaseMatches.map((match) => (
                <MatchEditor
                  key={match.id}
                  match={match}
                  phase={currentPhase}
                  teams={teams.slice(0, info.participantCount)}
                  teamLookup={teamLookup}
                  customColumns={resultColumns}
                  onChange={(updater) => updateMatch(match.id, updater)}
                  onSave={() => saveMatchResult(match.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "Phases" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {phaseTabs.map((phaseTab) => (
              <button
                key={phaseTab.id}
                type="button"
                onClick={() => setCurrentPhaseId(phaseTab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  currentPhase?.id === phaseTab.id ? "bg-primary text-white" : "bg-white text-slate-600 shadow-panel"
                }`}
              >
                {phaseTab.label}
              </button>
            ))}
          </div>
          {currentPhase?.type === "knockout" ? (
            <BracketView matches={currentPhaseMatches} teamLookup={teamLookup} title={currentPhase.name} />
          ) : currentStandings.length === 0 ? (
            <EmptyState title="No standings yet" description="Save results for this phase to populate the standings table." />
          ) : groupCount > 1 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: groupCount }, (_, groupIndex) => (
                <StandingsTable
                  key={groupIndex}
                  title={`Group ${String.fromCharCode(65 + groupIndex)}`}
                  rows={currentStandings.filter((row) => row.groupIndex === groupIndex)}
                  teamLookup={teamLookup}
                  customColumns={currentCustomColumns}
                />
              ))}
            </div>
          ) : (
            <StandingsTable title={currentPhase?.name ?? "Standings"} rows={currentStandings} teamLookup={teamLookup} customColumns={currentCustomColumns} />
          )}
        </div>
      ) : null}

      {activeTab === "Teams" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {teams.slice(0, info.participantCount).map((team) => (
            <Card key={team.id}>
              <div className="flex items-center gap-3">
                <span className="h-12 w-12 rounded-xl" style={{ backgroundColor: team.color }} />
                <div>
                  <p className="font-semibold text-slate-900">{team.name}</p>
                  <p className="text-sm text-slate-500">{team.abbreviation}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "Settings" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Structure controls</h3>
            <div className="grid gap-3">
              {phases.map((phase) => (
                <div key={phase.id} className="rounded-xl border border-border bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{phase.name}</span>
                    <Badge>{phase.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {settingsLocked ? "Locked to protect existing results." : "Unlocked. Structural edits can change generated advancement paths."}
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Standings extras</h3>
            <p className="text-sm text-slate-500">Custom columns shown here come from the currently selected phase.</p>
            <div className="grid gap-3">
              {resultColumns.length === 0 ? (
                <EmptyState title="No custom columns" description="This phase uses the default standings columns only." />
              ) : (
                resultColumns.map((column) => (
                  <div key={column.id} className="rounded-xl border border-border bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{column.name}</span>
                      <Badge>{column.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {column.showInStandings ? "Visible in standings." : "Hidden from standings."} {column.useAsTiebreaker ? "Available as a tiebreaker." : "Not used as a tiebreaker."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MatchEditor({
  match,
  phase,
  teams,
  teamLookup,
  customColumns,
  onChange,
  onSave,
}: {
  match: Match;
  phase?: Phase;
  teams: Team[];
  teamLookup: Record<string, Team>;
  customColumns: CustomColumn[];
  onChange: (updater: (match: Match) => Match) => void;
  onSave: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">{phase?.name ?? "Phase"} • {match.roundLabel}</p>
          <p className="mt-1 text-sm text-slate-500">Enter the match score first, then any extra standings values that this phase tracks.</p>
        </div>
        <Badge tone={match.played ? "green" : "yellow"}>{match.played ? "Result saved" : "Pending"}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Field label="Team A">
          <select className="flex h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-900 outline-none" value={match.teamA} onChange={(event) => onChange((current) => ({ ...current, teamA: event.target.value }))}>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Team B">
          <select className="flex h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-900 outline-none" value={match.teamB} onChange={(event) => onChange((current) => ({ ...current, teamB: event.target.value }))}>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`Score ${teamLookup[match.teamA]?.name ?? "Team A"}`}>
          <Input type="number" value={match.scoreA} onChange={(event) => onChange((current) => ({ ...current, scoreA: Number(event.target.value) }))} />
        </Field>
        <Field label={`Score ${teamLookup[match.teamB]?.name ?? "Team B"}`}>
          <Input type="number" value={match.scoreB} onChange={(event) => onChange((current) => ({ ...current, scoreB: Number(event.target.value) }))} />
        </Field>
      </div>

      {customColumns.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">Extra standings data</p>
          <p className="text-sm text-slate-500">These values are separate from the match score and feed the custom standings columns for this phase.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {customColumns.map((column) => (
              <div key={column.id} className="grid gap-3">
                <Field label={`${column.name} - ${teamLookup[match.teamA]?.name ?? "Team A"}`}>
                  <Input
                    type={column.type === "number" || column.type === "percentage" ? "number" : "text"}
                    value={String(match.extraValues?.[`${column.id}:A`] ?? column.defaultValue ?? "")}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        extraValues: {
                          ...current.extraValues,
                          [`${column.id}:A`]: column.type === "boolean" ? event.target.value === "true" : column.type === "text" ? event.target.value : Number(event.target.value),
                        },
                      }))
                    }
                  />
                </Field>
                <Field label={`${column.name} - ${teamLookup[match.teamB]?.name ?? "Team B"}`}>
                  <Input
                    type={column.type === "number" || column.type === "percentage" ? "number" : "text"}
                    value={String(match.extraValues?.[`${column.id}:B`] ?? column.defaultValue ?? "")}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        extraValues: {
                          ...current.extraValues,
                          [`${column.id}:B`]: column.type === "boolean" ? event.target.value === "true" : column.type === "text" ? event.target.value : Number(event.target.value),
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={onSave}>Save result</Button>
      </div>
    </Card>
  );
}

function PhaseSelector({
  phases,
  currentPhaseId,
  onChange,
}: {
  phases: { id: string; name: string }[];
  currentPhaseId: string;
  onChange: (phaseId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {phases.map((phase) => (
        <button
          key={phase.id}
          type="button"
          onClick={() => onChange(phase.id)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            currentPhaseId === phase.id ? "bg-primary text-white" : "bg-white text-slate-600 shadow-panel"
          }`}
        >
          {phase.name}
        </button>
      ))}
    </div>
  );
}

function StandingsTable({
  title,
  rows,
  teamLookup,
  customColumns,
}: {
  title: string;
  rows: StandingRow[];
  teamLookup: Record<string, Team>;
  customColumns: CustomColumn[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {["Pos", "Team", "P", "W", "D", "L", ...customColumns.map((column) => column.name), "Points"].map((head) => (
                <th key={head} className="whitespace-nowrap px-4 py-3 font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const team = teamLookup[row.teamId];
              const tone = row.status === "qualifies" ? "green" : row.status === "playoff" ? "yellow" : "red";
              return (
                <tr key={`${row.teamId}-${row.groupIndex ?? "main"}`} className="border-t border-border bg-white">
                  <td className="px-4 py-4">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: team?.color }} />
                      <span className="font-semibold text-slate-900">{team?.name}</span>
                      <Badge tone={tone}>{row.status}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4">{row.played}</td>
                  <td className="px-4 py-4">{row.wins}</td>
                  <td className="px-4 py-4">{row.draws}</td>
                  <td className="px-4 py-4">{row.losses}</td>
                  {customColumns.map((column) => (
                    <td key={column.id} className="px-4 py-4">
                      {String(row.customValues[column.id] ?? column.defaultValue ?? "")}
                    </td>
                  ))}
                  <td className="px-4 py-4 font-semibold text-slate-900">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BracketView({ matches, teamLookup, title }: { matches: Match[]; teamLookup: Record<string, Team>; title: string }) {
  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {matches.length === 0 ? (
        <EmptyState title="No bracket matches yet" description="Create or populate knockout matches to see the bracket." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((match) => {
            const winner = match.played && match.scoreA !== match.scoreB ? (match.scoreA > match.scoreB ? match.teamA : match.teamB) : "";
            return (
              <div key={match.id} className="rounded-xl border border-border bg-slate-50 p-4">
                <p className="mb-3 text-sm text-slate-500">{match.roundLabel}</p>
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${winner === match.teamA ? "bg-green-50" : "bg-white"}`}>
                  <span className="font-medium text-slate-900">{teamLookup[match.teamA]?.name ?? "TBD"}</span>
                  <span>{match.scoreA}</span>
                </div>
                <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 ${winner === match.teamB ? "bg-green-50" : "bg-white"}`}>
                  <span className="font-medium text-slate-900">{teamLookup[match.teamB]?.name ?? "TBD"}</span>
                  <span>{match.scoreB}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </Card>
  );
}
