import { type ReactNode, useMemo } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, GripVertical, Plus, Shuffle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTournamentStore, type ValidationIssue } from "@/store/use-tournament-store";
import type { CustomColumn, Phase, PhaseType, SetupStep, Team, TieBreakerRule } from "@/lib/types";

const steps: { key: SetupStep; title: string; description: string }[] = [
  { key: "info", title: "Tournament info", description: "Set the tournament name and basic details first." },
  { key: "participants", title: "Number of participants", description: "Choose how many teams the tournament should contain." },
  { key: "teams", title: "Teams", description: "Fill every participant slot with a real team." },
  { key: "phases", title: "Phase setup", description: "Build the competition flow and qualification counts." },
  { key: "scoring", title: "Scoring", description: "Define points for wins, draws, and losses for every standings phase." },
  { key: "standings", title: "Standings columns", description: "Keep the table simple by default, then add custom columns only when needed." },
  { key: "tiebreakers", title: "Tiebreakers", description: "Start with points and wins, then add any extra ranking rules." },
  { key: "seeding", title: "Seeding and groups", description: "Assign teams to groups cleanly before starting." },
  { key: "review", title: "Review", description: "Check the full tournament summary and all warnings." },
  { key: "start", title: "Start tournament", description: "Lock the structure and move into results and standings." },
];

const phaseLabels: Record<PhaseType, string> = {
  groups: "Group stage",
  league: "League phase",
  swiss: "Swiss phase",
  knockout: "Knockout phase",
};

const customColumnTypes: CustomColumn["type"][] = ["number", "text", "boolean", "percentage"];
const defaultHeaders = ["Team", "Played", "Wins", "Draws", "Losses", "Points"];

export function SetupWizard() {
  const navigate = useNavigate();
  const store = useTournamentStore();
  const {
    info,
    teams,
    phases,
    currentStep,
    settingsLocked,
    validationIssues,
    stepValidations,
    updateInfo,
    setParticipantCount,
    setCurrentStep,
    addTeam,
    updateTeam,
    addPhase,
    removePhase,
    movePhase,
    updatePhase,
    updatePhaseName,
    randomizeGroups,
    moveTeamBetweenGroups,
    addCustomColumn,
    updateCustomColumn,
    removeCustomColumn,
    moveTieBreaker,
    toggleTieBreaker,
    startTournament,
  } = store;

  const stepIndex = steps.findIndex((step) => step.key === currentStep);
  const prevStep = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const nextStep = stepIndex < steps.length - 1 ? steps[stepIndex + 1] : undefined;
  const currentValidation = stepValidations[currentStep];
  const standingsPhases = useMemo(() => phases.filter((phase) => phase.type !== "knockout"), [phases]);
  const currentIssues = currentValidation.issues;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit p-4">
        <div className="space-y-3">
          {steps.map((step, index) => {
            const validation = stepValidations[step.key];
            const disabled = steps.slice(0, index).some((entry) => !stepValidations[entry.key].valid);
            return (
              <button
                key={step.key}
                type="button"
                disabled={disabled}
                onClick={() => setCurrentStep(step.key)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  currentStep === step.key ? "border-blue-500 bg-blue-50" : "border-transparent bg-slate-50 hover:bg-slate-100"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <Badge tone={validation.valid ? "green" : "red"}>{validation.valid ? "Ready" : "Needs work"}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{step.description}</p>
                {!validation.valid ? <p className="mt-2 text-xs text-red-700">{validation.message}</p> : null}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-6">
        {currentIssues.length > 0 ? <IssuePanel title="Fix these items before continuing" issues={currentIssues} /> : null}

        <Card className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{steps[stepIndex].title}</h2>
            <p className="mt-2 text-sm text-slate-500">{steps[stepIndex].description}</p>
          </div>

          {currentStep === "info" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tournament name" description="Use a clear public-facing name.">
                <Input value={info.name} disabled={settingsLocked} onChange={(event) => updateInfo({ ...info, name: event.target.value })} />
              </Field>
              <Field label="Logo URL" description="Optional. Leave blank if not needed.">
                <Input value={info.logo} disabled={settingsLocked} onChange={(event) => updateInfo({ ...info, logo: event.target.value })} />
              </Field>
              <Field label="Description" description="Optional summary shown on the dashboard." className="md:col-span-2">
                <Textarea value={info.description} disabled={settingsLocked} onChange={(event) => updateInfo({ ...info, description: event.target.value })} />
              </Field>
            </div>
          ) : null}

          {currentStep === "participants" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <Field label="Number of participants" description="Choose the total field size before setting teams or qualification rules.">
                <Input type="number" min={2} max={128} disabled={settingsLocked} value={info.participantCount} onChange={(event) => setParticipantCount(Number(event.target.value))} />
              </Field>
              <Card className="bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">What changes next</p>
                <p className="mt-2 text-sm text-slate-600">This number drives the team list, phase capacity, group sizes, and knockout validation.</p>
              </Card>
            </div>
          ) : null}

          {currentStep === "teams" ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button disabled={settingsLocked} onClick={() => addTeam()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add team slot
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {teams.slice(0, info.participantCount).map((team, index) => (
                  <TeamEditor key={team.id} team={team} index={index} locked={settingsLocked} onUpdate={(updater) => updateTeam(team.id, updater)} />
                ))}
              </div>
            </div>
          ) : null}

          {currentStep === "phases" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["groups", "league", "swiss", "knockout"] as PhaseType[]).map((type) => (
                  <Button key={type} variant="secondary" disabled={settingsLocked} onClick={() => addPhase(type)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {phaseLabels[type]}
                  </Button>
                ))}
              </div>
              <div className="space-y-4">
                {phases.map((phase, index) => (
                  <Card key={phase.id} className="space-y-4 border border-border bg-slate-50">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <Input value={phase.name} disabled={settingsLocked} onChange={(event) => updatePhaseName(phase.id, event.target.value)} />
                        <p className="mt-2 text-sm text-slate-500">
                          {phaseLabels[phase.type]} • receives {phase.inputTeams ?? 0} teams • outputs {phase.outputTeams ?? 0} teams
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={settingsLocked || index === 0} onClick={() => movePhase(phase.id, "up")}>
                          Up
                        </Button>
                        <Button size="sm" variant="outline" disabled={settingsLocked || index === phases.length - 1} onClick={() => movePhase(phase.id, "down")}>
                          Down
                        </Button>
                        <Button size="sm" variant="outline" disabled={settingsLocked} onClick={() => removePhase(phase.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {phase.groupSettings ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <NumberField label="Number of groups" value={phase.groupSettings.groupCount} min={1} max={Math.max(1, phase.inputTeams ?? 1)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, groupCount: value } }))} />
                        <NumberField label="Teams per group" value={phase.groupSettings.teamsPerGroup} min={2} max={Math.max(2, phase.inputTeams ?? 2)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, teamsPerGroup: value } }))} />
                        <SelectField label="Allow uneven groups" value={phase.groupSettings.allowUnevenGroups ? "Yes" : "No"} locked={settingsLocked} options={["No", "Yes"]} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, allowUnevenGroups: value === "Yes" } }))} />
                        <NumberField label="Qualifiers per group" value={phase.groupSettings.qualifiersPerGroup} min={0} max={Math.max(0, phase.groupSettings.teamsPerGroup)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, qualifiersPerGroup: value } }))} />
                        <NumberField label="Best second-place teams" value={phase.groupSettings.bestSecondPlaceCount} min={0} max={Math.max(0, phase.groupSettings.groupCount)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, bestSecondPlaceCount: value } }))} />
                        <NumberField label="Best third-place teams" value={phase.groupSettings.bestThirdPlaceCount} min={0} max={Math.max(0, phase.groupSettings.groupCount)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, bestThirdPlaceCount: value } }))} />
                      </div>
                    ) : null}

                    {phase.leagueSettings ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <NumberField label="Rounds" value={phase.leagueSettings.rounds} min={1} max={6} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, rounds: value } }))} />
                        <NumberField label="Teams qualifying" value={phase.leagueSettings.playoffSpots} min={2} max={Math.max(2, phase.inputTeams ?? 2)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, playoffSpots: value } }))} />
                      </div>
                    ) : null}

                    {phase.swissSettings ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <NumberField label="Rounds" value={phase.swissSettings.rounds} min={1} max={Math.max(1, (phase.inputTeams ?? 2) + 1)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, swissSettings: { ...current.swissSettings!, rounds: value } }))} />
                        <NumberField label="Teams qualifying" value={phase.swissSettings.advancingTeams} min={2} max={Math.max(2, phase.inputTeams ?? 2)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, swissSettings: { ...current.swissSettings!, advancingTeams: value } }))} />
                        <SelectField label="Allow byes" value={phase.swissSettings.allowByes ? "Yes" : "No"} locked={settingsLocked} options={["No", "Yes"]} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, swissSettings: { ...current.swissSettings!, allowByes: value === "Yes" } }))} />
                      </div>
                    ) : null}

                    {phase.knockoutSettings ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <SelectField label="Knockout type" value={phase.knockoutSettings.format} locked={settingsLocked} options={["Single Elimination", "Double Elimination"]} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, format: value as "Single Elimination" | "Double Elimination" } }))} />
                        <SelectField label="Allow byes" value={phase.knockoutSettings.allowByes ? "Yes" : "No"} locked={settingsLocked} options={["No", "Yes"]} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, allowByes: value === "Yes" } }))} />
                        <SelectField label="Seeding" value={phase.knockoutSettings.seeding} locked={settingsLocked} options={["Ranked", "Random Draw", "Manual"]} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, seeding: value as "Ranked" | "Random Draw" | "Manual" } }))} />
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {currentStep === "scoring" ? (
            <div className="space-y-4">
              {standingsPhases.map((phase) => (
                <Card key={phase.id} className="space-y-4 border border-border bg-slate-50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
                    <p className="text-sm text-slate-500">These values control how standings points are awarded in this phase.</p>
                  </div>
                  <PointsEditor
                    points={phase.groupSettings?.points ?? phase.leagueSettings?.points ?? phase.swissSettings?.points ?? { win: 3, draw: 1, loss: 0 }}
                    locked={settingsLocked}
                    onChange={(points) =>
                      updatePhase(phase.id, (current) => ({
                        ...current,
                        groupSettings: current.groupSettings ? { ...current.groupSettings, points } : current.groupSettings,
                        leagueSettings: current.leagueSettings ? { ...current.leagueSettings, points } : current.leagueSettings,
                        swissSettings: current.swissSettings ? { ...current.swissSettings, points } : current.swissSettings,
                      }))
                    }
                  />
                </Card>
              ))}
            </div>
          ) : null}

          {currentStep === "standings" ? (
            <div className="space-y-6">
              {standingsPhases.map((phase) => {
                const columns = phase.groupSettings?.customColumns ?? phase.leagueSettings?.customColumns ?? phase.swissSettings?.customColumns ?? [];
                const visibleHeaders = [...defaultHeaders, ...columns.filter((column) => column.showInStandings).map((column) => column.name || "Custom column")];
                return (
                  <Card key={phase.id} className="space-y-4 border border-border bg-slate-50">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
                      <p className="text-sm text-slate-500">Default standings stay simple. Add extra columns only when this phase needs them.</p>
                    </div>
                    <StandingsPreview headers={visibleHeaders} />
                    <CustomColumnEditor phase={phase} locked={settingsLocked} addCustomColumn={addCustomColumn} updateCustomColumn={updateCustomColumn} removeCustomColumn={removeCustomColumn} />
                  </Card>
                );
              })}
            </div>
          ) : null}

          {currentStep === "tiebreakers" ? (
            <div className="space-y-4">
              {standingsPhases.map((phase) => (
                <TieBreakerEditor key={phase.id} phase={phase} locked={settingsLocked} moveTieBreaker={moveTieBreaker} toggleTieBreaker={toggleTieBreaker} />
              ))}
            </div>
          ) : null}

          {currentStep === "seeding" ? (
            <div className="space-y-6">
              {phases.filter((phase) => phase.type === "groups").map((phase) => (
                <Card key={phase.id} className="space-y-4 border border-border bg-slate-50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
                      <p className="text-sm text-slate-500">Randomize first, then move teams if you need manual adjustments.</p>
                    </div>
                    <Button variant="outline" disabled={settingsLocked} onClick={() => randomizeGroups(phase.id)}>
                      <Shuffle className="mr-2 h-4 w-4" />
                      Randomize groups
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {(phase.groupAssignments ?? []).map((group, groupIndex) => (
                      <Card key={`${phase.id}-${groupIndex}`} className="space-y-3 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900">{`Group ${String.fromCharCode(65 + groupIndex)}`}</p>
                          <Badge>{group.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {group.map((teamId) => {
                            const team = teams.find((entry) => entry.id === teamId);
                            if (!team) return null;
                            return (
                              <div key={teamId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: team.color }} />
                                  <span className="font-medium text-slate-900">{team.name}</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" disabled={settingsLocked || groupIndex === 0} onClick={() => moveTeamBetweenGroups(phase.id, groupIndex, teamId, "left")}>
                                    ←
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={settingsLocked || groupIndex === (phase.groupAssignments?.length ?? 1) - 1} onClick={() => moveTeamBetweenGroups(phase.id, groupIndex, teamId, "right")}>
                                    →
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {currentStep === "review" ? (
            <div className="space-y-4">
              {validationIssues.length > 0 ? <IssuePanel title="Invalid setup items" issues={validationIssues} /> : null}
              <Card className="grid gap-4 bg-slate-50 md:grid-cols-2 xl:grid-cols-4">
                <SummaryItem label="Participants" value={String(info.participantCount)} />
                <SummaryItem label="Phases" value={String(phases.length)} />
                <SummaryItem label="Teams qualifying" value={phases.map((phase) => `${phase.name}: ${phase.outputTeams ?? 0}`).join(" | ")} />
                <SummaryItem label="Tiebreakers" value={standingsPhases.map((phase) => `${phase.name}: ${(phase.groupSettings?.tieBreakers ?? phase.leagueSettings?.tieBreakers ?? phase.swissSettings?.tieBreakers ?? []).filter((rule) => rule.enabled).map((rule) => rule.label).join(", ") || "None"}`).join(" | ")} />
              </Card>
              {standingsPhases.map((phase) => {
                const customColumns = phase.groupSettings?.customColumns ?? phase.leagueSettings?.customColumns ?? phase.swissSettings?.customColumns ?? [];
                const points = phase.groupSettings?.points ?? phase.leagueSettings?.points ?? phase.swissSettings?.points;
                return (
                  <Card key={phase.id} className="space-y-2 border border-border bg-white">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{phase.name}</p>
                      <Badge tone="blue">{phaseLabels[phase.type]}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">Receives {phase.inputTeams ?? 0} teams and sends {phase.outputTeams ?? 0} teams to the next stage.</p>
                    {points ? <p className="text-sm text-slate-600">Scoring: win {points.win}, draw {points.draw}, loss {points.loss}</p> : null}
                    <p className="text-sm text-slate-600">Custom columns: {customColumns.length > 0 ? customColumns.map((column) => column.name).join(", ") : "None"}</p>
                  </Card>
                );
              })}
            </div>
          ) : null}

          {currentStep === "start" ? (
            <div className="space-y-4">
              {stepValidations.start.valid ? (
                <Card className="bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Ready to start</p>
                  <p className="mt-1 text-sm text-slate-500">All setup checks passed. Starting now locks the structure and opens phase-based standings and result entry.</p>
                </Card>
              ) : (
                <IssuePanel title="Start is disabled" issues={stepValidations.start.issues} />
              )}
              <div className="flex justify-end">
                <Button
                  disabled={!stepValidations.start.valid || settingsLocked}
                  onClick={() => {
                    startTournament();
                    navigate("/dashboard");
                  }}
                >
                  Start tournament
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" disabled={!prevStep} onClick={() => prevStep && setCurrentStep(prevStep.key)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <p className="text-sm text-slate-500">{currentValidation.valid ? "This step is complete." : currentValidation.message}</p>
            <Button disabled={!nextStep || !currentValidation.valid} onClick={() => nextStep && setCurrentStep(nextStep.key)}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function IssuePanel({ title, issues }: { title: string; issues: ValidationIssue[] }) {
  return (
    <Card className="border border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-700" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-900">{title}</p>
          <div className="mt-3 space-y-3">
            {issues.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-red-200 bg-white/70 p-3">
                <p className="font-medium text-red-900">{entry.title}</p>
                <p className="mt-1 text-sm text-red-800">{entry.message}</p>
                <p className="mt-1 text-sm text-red-700">How to fix it: {entry.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TeamEditor({ team, index, locked, onUpdate }: { team: Team; index: number; locked: boolean; onUpdate: (updater: (team: Team) => Team) => void }) {
  return (
    <Card className="space-y-3 border border-border bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <Badge>{index + 1}</Badge>
        <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: team.color }} />
      </div>
      <Input value={team.name} disabled={locked} onChange={(event) => onUpdate((current) => ({ ...current, name: event.target.value }))} />
      <Input value={team.abbreviation} disabled={locked} onChange={(event) => onUpdate((current) => ({ ...current, abbreviation: event.target.value }))} />
      <Input type="color" value={team.color} disabled={locked} onChange={(event) => onUpdate((current) => ({ ...current, color: event.target.value }))} />
    </Card>
  );
}

function TieBreakerEditor({
  phase,
  locked,
  moveTieBreaker,
  toggleTieBreaker,
}: {
  phase: Phase;
  locked: boolean;
  moveTieBreaker: (phaseId: string, tieBreakerId: string, direction: "up" | "down") => void;
  toggleTieBreaker: (phaseId: string, tieBreakerId: string) => void;
}) {
  const tieBreakers = phase.groupSettings?.tieBreakers ?? phase.leagueSettings?.tieBreakers ?? phase.swissSettings?.tieBreakers ?? [];
  return (
    <Card className="space-y-4 border border-border bg-slate-50">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
        <p className="text-sm text-slate-500">Default order starts with Points and Wins. Enable more only when the phase needs them.</p>
      </div>
      <div className="space-y-2">
        {tieBreakers.map((tieBreaker, index) => (
          <div key={tieBreaker.id} className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-slate-400" />
              <label className="flex items-center gap-2 text-sm text-slate-900">
                <input type="checkbox" checked={tieBreaker.enabled} disabled={locked} onChange={() => toggleTieBreaker(phase.id, tieBreaker.id)} />
                {tieBreaker.label}
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={locked || index === 0} onClick={() => moveTieBreaker(phase.id, tieBreaker.id, "up")}>
                Up
              </Button>
              <Button size="sm" variant="outline" disabled={locked || index === tieBreakers.length - 1} onClick={() => moveTieBreaker(phase.id, tieBreaker.id, "down")}>
                Down
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CustomColumnEditor({
  phase,
  locked,
  addCustomColumn,
  updateCustomColumn,
  removeCustomColumn,
}: {
  phase: Phase;
  locked: boolean;
  addCustomColumn: (phaseId: string, type: CustomColumn["type"]) => void;
  updateCustomColumn: (phaseId: string, columnId: string, updater: (column: CustomColumn) => CustomColumn) => void;
  removeCustomColumn: (phaseId: string, columnId: string) => void;
}) {
  const columns = phase.groupSettings?.customColumns ?? phase.leagueSettings?.customColumns ?? phase.swissSettings?.customColumns ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">Custom standings columns</p>
          <p className="text-sm text-slate-500">Examples: Fair Play Points, Bonus Points, Sets Won, Map Difference.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {customColumnTypes.map((type) => (
            <Button key={type} size="sm" variant="outline" disabled={locked} onClick={() => addCustomColumn(phase.id, type)}>
              <Plus className="mr-2 h-4 w-4" />
              Add {type}
            </Button>
          ))}
        </div>
      </div>
      {columns.length === 0 ? <p className="text-sm text-slate-500">No custom columns added for this phase.</p> : null}
      <div className="space-y-3">
        {columns.map((column) => (
          <Card key={column.id} className="grid gap-3 border border-border bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
            <Field label="Column name">
              <Input value={column.name} disabled={locked} onChange={(event) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <SelectField label="Type" value={column.type} locked={locked} options={customColumnTypes} onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, type: value as CustomColumn["type"] }))} />
            <Field label="Default value">
              <Input value={String(column.defaultValue ?? "")} disabled={locked} onChange={(event) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, defaultValue: column.type === "boolean" ? event.target.value === "true" : column.type === "text" ? event.target.value : Number(event.target.value) }))} />
            </Field>
            <SelectField label="Show in standings" value={column.showInStandings ? "Yes" : "No"} locked={locked} options={["Yes", "No"]} onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, showInStandings: value === "Yes" }))} />
            <SelectField
              label="Allow as tiebreaker"
              value={column.useAsTiebreaker ? "Yes" : "No"}
              locked={locked}
              options={["No", "Yes"]}
              onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, useAsTiebreaker: value === "Yes" && (current.type === "number" || current.type === "percentage") }))}
            />
            {(column.type === "number" || column.type === "percentage") ? (
              <SelectField label="Ranking direction" value={column.rankingDirection ?? "higher"} locked={locked} options={["higher", "lower"]} onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, rankingDirection: value as CustomColumn["rankingDirection"] }))} />
            ) : (
              <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-slate-500">Only numeric and percentage columns can rank teams.</div>
            )}
            <div className="md:col-span-2 xl:col-span-6">
              <Button size="sm" variant="outline" disabled={locked} onClick={() => removeCustomColumn(phase.id, column.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove column
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StandingsPreview({ headers }: { headers: string[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            {headers.map((header) => (
              <td key={header} className="whitespace-nowrap px-4 py-3 text-slate-400">
                {header === "Team" ? "Example Team" : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, description, className, children }: { label: string; description?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {description ? <p className="mb-2 text-xs text-slate-500">{description}</p> : null}
      {children}
    </div>
  );
}

function NumberField({ label, value, min, max, locked, onChange }: { label: string; value: number; min: number; max: number; locked: boolean; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" value={value} min={min} max={max} disabled={locked} onChange={(event) => onChange(Number(event.target.value))} />
      <p className="mt-1 text-xs text-slate-500">{`Allowed range: ${min} to ${max}`}</p>
    </Field>
  );
}

function SelectField({ label, value, locked, options, onChange }: { label: string; value: string; locked: boolean; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <select className="flex h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-900 outline-none" value={value} disabled={locked} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function PointsEditor({
  points,
  locked,
  onChange,
}: {
  points: { win: number; draw: number; loss: number };
  locked: boolean;
  onChange: (points: { win: number; draw: number; loss: number }) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="Points for win" description="Awarded to the winner of a match.">
        <Input type="number" value={points.win} disabled={locked} onChange={(event) => onChange({ ...points, win: Number(event.target.value) })} />
      </Field>
      <Field label="Points for draw" description="Awarded to both teams after a draw.">
        <Input type="number" value={points.draw} disabled={locked} onChange={(event) => onChange({ ...points, draw: Number(event.target.value) })} />
      </Field>
      <Field label="Points for loss" description="Awarded to the losing team, if your format uses that.">
        <Input type="number" value={points.loss} disabled={locked} onChange={(event) => onChange({ ...points, loss: Number(event.target.value) })} />
      </Field>
    </div>
  );
}
