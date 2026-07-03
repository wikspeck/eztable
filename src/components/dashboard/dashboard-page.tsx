import { useMemo, useState } from "react";
import { AlertTriangle, Download, Lock, Save, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTournamentStore } from "@/store/use-tournament-store";
import type { CustomColumn, StandingRow, Team } from "@/lib/types";

const tabs = ["Overview", "Matches", "Standings", "Bracket", "Teams", "Settings"] as const;

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const { info, phases, teams, matches, standings, currentPhaseId, settingsLocked, hasStarted, unlockSettings, relockSettings, updateMatchScore } =
    useTournamentStore();

  const teamLookup = useMemo<Record<string, Team>>(() => Object.fromEntries(teams.map((team) => [team.id, team])), [teams]);
  const currentPhase = phases.find((phase) => phase.id === currentPhaseId) ?? phases[0];
  const currentPhaseMatches = matches.filter((match) => match.phaseId === currentPhase?.id);
  const currentStandings = standings.filter((row) => row.phaseId === currentPhase?.id);
  const progress = Math.round((matches.filter((match) => match.played).length / Math.max(matches.length, 1)) * 100);
  const knockoutPhase = phases.find((phase) => phase.type === "knockout");
  const bracketMatches = matches.filter((match) => match.phaseId === knockoutPhase?.id);
  const groupCount = Math.max(...currentStandings.map((row) => (row.groupIndex ?? 0) + 1), 0);
  const currentCustomColumns = currentPhase?.groupSettings?.customColumns ?? currentPhase?.leagueSettings?.customColumns ?? currentPhase?.swissSettings?.customColumns ?? [];

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
              <p className="mt-1 text-sm text-amber-800">Results stay intact here, but structural edits can change who advances. Relock once the structure is stable.</p>
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
            <h3 className="text-lg font-bold text-slate-900">Current phase overview</h3>
            <div className="mt-5 space-y-3">
              {phases.map((phase, index) => (
                <div key={phase.id} className="rounded-xl border border-border bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{phase.name}</p>
                      <p className="text-sm capitalize text-slate-500">
                        {phase.type} · in {phase.inputTeams ?? 0} · out {phase.outputTeams ?? 0}
                      </p>
                    </div>
                    <Badge tone={phase.id === currentPhase?.id ? "green" : "slate"}>{`Phase ${index + 1}`}</Badge>
                  </div>
                </div>
              ))}
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

      {activeTab === "Matches" ? (
        <div className="grid gap-4">
          {currentPhaseMatches.length === 0 ? (
            <EmptyState title="No matches yet" description="Start the tournament to generate fixtures for the current phase." />
          ) : (
            currentPhaseMatches.map((match) => {
              const teamA = teamLookup[match.teamA];
              const teamB = teamLookup[match.teamB];
              return (
                <Card key={match.id} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{match.roundLabel}</p>
                    <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-slate-900">
                      <span>{teamA?.name ?? "BYE"}</span>
                      <span className="text-slate-400">vs</span>
                      <span>{teamB?.name ?? "BYE"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" className="w-20" value={match.scoreA} onChange={(event) => updateMatchScore(match.id, Number(event.target.value), match.scoreB)} />
                    <span className="text-slate-400">:</span>
                    <Input type="number" className="w-20" value={match.scoreB} onChange={(event) => updateMatchScore(match.id, match.scoreA, Number(event.target.value))} />
                    <Button size="sm" onClick={() => updateMatchScore(match.id, match.scoreA, match.scoreB)}>Save</Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {activeTab === "Standings" ? (
        currentStandings.length === 0 ? (
          <EmptyState title="No standings available" description="This phase does not produce a table yet, or matches have not been generated." />
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
        )
      ) : null}

      {activeTab === "Bracket" ? (
        knockoutPhase ? (
          <div className="overflow-x-auto">
            <div className="flex min-w-[720px] gap-6">
              <div className="w-full max-w-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{knockoutPhase.name}</h3>
                {bracketMatches.map((match) => {
                  const teamA = teamLookup[match.teamA];
                  const teamB = teamLookup[match.teamB];
                  const winner =
                    match.played && match.scoreA !== match.scoreB
                      ? match.scoreA > match.scoreB
                        ? match.teamA
                        : match.teamB
                      : "";
                  return (
                    <div key={match.id} className="relative rounded-xl border border-border bg-white p-4 shadow-panel">
                      <div className="absolute -right-6 top-1/2 hidden h-px w-6 bg-slate-300 lg:block" />
                      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${winner === match.teamA ? "bg-green-50" : "bg-slate-50"}`}>
                        <span className="font-medium text-slate-900">{teamA?.name ?? "BYE"}</span>
                        <span>{match.scoreA}</span>
                      </div>
                      <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 ${winner === match.teamB ? "bg-green-50" : "bg-slate-50"}`}>
                        <span className="font-medium text-slate-900">{teamB?.name ?? "BYE"}</span>
                        <span>{match.scoreB}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No knockout bracket" description="Add a knockout phase in setup if you want a bracket view." />
        )
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
            <h3 className="text-lg font-bold text-slate-900">Ranking and custom columns</h3>
            <p className="text-sm text-slate-500">Custom standings columns are shown in the relevant phase tables. Numeric custom columns can participate in ranking if enabled during setup.</p>
            <div className="grid gap-3">
              {currentCustomColumns.length === 0 ? (
                <EmptyState title="No custom columns" description="Add custom columns in setup if you want extra tracked standings values." />
              ) : (
                currentCustomColumns.map((column) => (
                  <div key={column.id} className="rounded-xl border border-border bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{column.name}</span>
                      <Badge>{column.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{column.affectsRanking ? "Used in ranking when enabled as a tie breaker." : "Displayed only."}</p>
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
    <Card className="overflow-x-auto p-0">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {["Pos", "Team", "P", "W", "D", "L", "GF", "GA", "GD", ...customColumns.map((column) => column.name), "Pts"].map((head) => (
              <th key={head} className="px-4 py-3 font-medium">
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
                <td className="px-4 py-4">{row.goalsFor}</td>
                <td className="px-4 py-4">{row.goalsAgainst}</td>
                <td className="px-4 py-4">{row.goalsFor - row.goalsAgainst}</td>
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </Card>
  );
}
