import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, PencilLine, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTournamentStore } from "@/store/use-tournament-store";

const tabs = ["Overview", "Matches", "Standings", "Bracket", "Teams", "Statistics", "Settings"] as const;

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const { info, phases, teams, matches, standings, updateMatchScore } = useTournamentStore();

  const progress = useMemo(() => {
    const played = matches.filter((match) => match.played).length;
    return Math.round((played / Math.max(matches.length, 1)) * 100);
  }, [matches]);

  const teamLookup = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.id, team])),
    [teams],
  );

  const statsData = [
    { label: "Matches", value: matches.length },
    { label: "Completed", value: matches.filter((match) => match.played).length },
    { label: "Teams", value: teams.length },
    { label: "Phases", value: phases.length },
  ];

  return (
    <div className="space-y-6">
      <Card className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900">{info.name}</h2>
            <Badge tone="blue">{phases[0]?.name ?? "No phases"}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">{info.description}</p>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
              <span>Overall progress</span>
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
            Export JSON
          </Button>
          <Button variant="outline">
            <PencilLine className="mr-2 h-4 w-4" />
            Edit settings
          </Button>
        </div>
      </Card>

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
            <h3 className="text-lg font-bold text-slate-900">Competition flow</h3>
            <div className="mt-5 flex flex-col gap-3">
              {phases.map((phase, index) => (
                <div key={phase.id} className="rounded-xl border border-border bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{phase.name}</p>
                      <p className="text-sm text-slate-500 capitalize">{phase.type}</p>
                    </div>
                    <Badge>{`Phase ${index + 1}`}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-bold text-slate-900">High-level statistics</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {statsData.map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "Matches" ? (
        <div className="grid gap-4">
          {matches.map((match) => {
            const teamA = teamLookup[match.teamA];
            const teamB = teamLookup[match.teamB];
            return (
              <Card key={match.id} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-slate-500">{match.roundLabel}</p>
                  <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-slate-900">
                    <span>{teamA?.name ?? "TBD"}</span>
                    <span className="text-slate-400">vs</span>
                    <span>{teamB?.name ?? "TBD"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    defaultValue={match.scoreA}
                    onChange={(event) => updateMatchScore(match.id, Number(event.target.value), match.scoreB)}
                  />
                  <span className="text-slate-400">:</span>
                  <Input
                    type="number"
                    className="w-20"
                    defaultValue={match.scoreB}
                    onChange={(event) => updateMatchScore(match.id, match.scoreA, Number(event.target.value))}
                  />
                  <Button size="sm">Save</Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {activeTab === "Standings" ? (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Pos", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "Pts"].map((head) => (
                  <th key={head} className="px-4 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => {
                const team = teamLookup[row.teamId];
                const goalDifference = row.goalsFor - row.goalsAgainst;
                const tone = row.status === "qualifies" ? "green" : row.status === "playoff" ? "yellow" : "red";
                return (
                  <tr key={row.teamId} className="border-t border-border bg-white">
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
                    <td className="px-4 py-4">{goalDifference}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}

      {activeTab === "Bracket" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((round) => (
            <Card key={round}>
              <h3 className="text-lg font-bold text-slate-900">{round === 3 ? "Final" : `Round ${round}`}</h3>
              <div className="mt-4 space-y-3">
                {matches
                  .filter((match) => match.phaseId === "phase-knockout")
                  .map((match) => (
                    <div key={match.id} className="rounded-xl border border-border bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{teamLookup[match.teamA]?.name ?? "TBD"}</span>
                        <span>{match.scoreA}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-medium text-slate-900">{teamLookup[match.teamB]?.name ?? "TBD"}</span>
                        <span>{match.scoreB}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "Teams" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {teams.map((team) => (
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

      {activeTab === "Statistics" ? (
        <Card className="h-[360px]">
          <h3 className="text-lg font-bold text-slate-900">Tournament output</h3>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1769ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {activeTab === "Settings" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit rules</h3>
            <p className="text-sm text-slate-500">
              Tournament settings stay editable. Rule changes are designed to recalculate stages and standings without reloading the app.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingRow label="Points system" value="3 / 1 / 0" />
              <SettingRow label="Swiss rematches" value="Disabled" />
              <SettingRow label="Knockout format" value="Single elimination" />
              <SettingRow label="Third place match" value="Enabled" />
            </div>
          </Card>
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Local-first data</h3>
            <p className="text-sm text-slate-500">
              The current implementation keeps everything in local state, with room for future import, export, and backend sync layers.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingRow label="Storage mode" value="In-browser state" />
              <SettingRow label="Export formats" value="JSON / CSV / tournament file" />
              <SettingRow label="Undo support" value="Planned action history layer" />
              <SettingRow label="Backend readiness" value="Store isolated from UI" />
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
