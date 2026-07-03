import { type ReactNode, useMemo } from "react";
import { ArrowLeft, ArrowRight, Info, MoveHorizontal, Plus, Shuffle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTournamentStore } from "@/store/use-tournament-store";
import type { CustomColumn, Phase, PhaseType, SetupStep, Team, TieBreakerRule } from "@/lib/types";

const steps: { key: SetupStep; title: string; description: string }[] = [
  { key: "info", title: "Tournament Info", description: "Name, branding, and tournament identity." },
  { key: "participants", title: "Participants", description: "Set the total number of teams before anything else." },
  { key: "teams", title: "Teams", description: "Team names, abbreviations, and colors." },
  { key: "phases", title: "Phase Setup", description: "Choose the tournament phases and their order." },
  { key: "rules", title: "Phase Rules", description: "Points, qualifiers, tie breakers, and custom columns." },
  { key: "seeding", title: "Seeding", description: "Randomize and manually correct group assignments." },
  { key: "review", title: "Review", description: "Final structure summary with phase input/output counts." },
  { key: "start", title: "Start Tournament", description: "Lock the settings and generate the tournament." },
];

const phaseLabels: Record<PhaseType, string> = {
  groups: "Group stage",
  league: "League phase",
  swiss: "Swiss phase",
  knockout: "Knockout phase",
};

const customColumnTypes: CustomColumn["type"][] = ["number", "text", "boolean", "percentage"];

export function SetupWizard() {
  const navigate = useNavigate();
  const store = useTournamentStore();
  const {
    info,
    teams,
    phases,
    currentStep,
    settingsLocked,
    validationWarnings,
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
  const currentValidation = stepValidations[currentStep];
  const canGoNext = currentValidation?.valid ?? false;
  const prevStep = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const nextStep = stepIndex < steps.length - 1 ? steps[stepIndex + 1] : undefined;

  const standingsPhases = useMemo(() => phases.filter((phase) => phase.type !== "knockout"), [phases]);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
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
                className={`w-full rounded-xl px-4 py-3 text-left transition ${
                  currentStep === step.key ? "bg-primary text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <Badge tone={validation.valid ? "green" : "yellow"}>{validation.valid ? "Ready" : "Blocked"}</Badge>
                </div>
                <p className={`mt-1 text-xs ${currentStep === step.key ? "text-blue-100" : "text-slate-500"}`}>{step.description}</p>
                {!validation.valid && validation.message ? <p className={`mt-2 text-xs ${currentStep === step.key ? "text-blue-100" : "text-amber-700"}`}>{validation.message}</p> : null}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-6">
        {validationWarnings.length > 0 ? (
          <Card className="border border-amber-200 bg-amber-50">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">Setup warnings</p>
                <div className="mt-2 space-y-1 text-sm text-amber-800">
                  {validationWarnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{steps[stepIndex].title}</h2>
            <p className="mt-2 text-sm text-slate-500">{steps[stepIndex].description}</p>
          </div>

          {currentStep === "info" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tournament name">
                <Input value={info.name} disabled={settingsLocked} onChange={(event) => updateInfo({ ...info, name: event.target.value })} />
              </Field>
              <Field label="Logo URL">
                <Input value={info.logo} disabled={settingsLocked} onChange={(event) => updateInfo({ ...info, logo: event.target.value })} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea value={info.description} disabled={settingsLocked} onChange={(event) => updateInfo({ ...info, description: event.target.value })} />
              </Field>
            </div>
          ) : null}

          {currentStep === "participants" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Number of participants">
                <Input type="number" min={2} max={128} disabled={settingsLocked} value={info.participantCount} onChange={(event) => setParticipantCount(Number(event.target.value))} />
              </Field>
              <Card className="bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Constraint preview</p>
                <p className="mt-1 font-semibold text-slate-900">{info.participantCount} teams feed directly into phase calculations and disabled options.</p>
              </Card>
            </div>
          ) : null}

          {currentStep === "teams" ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button disabled={settingsLocked} onClick={() => addTeam()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add team
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
                {(["groups", "league", "swiss", "knockout"] as PhaseType[]).map((type) => {
                  const lastPhase = phases.length > 0 ? phases[phases.length - 1] : undefined;
                  const disabled = type === "knockout" && (lastPhase?.outputTeams ?? info.participantCount) < 2;
                  return (
                    <Button key={type} variant="secondary" disabled={settingsLocked || disabled} onClick={() => addPhase(type)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {phaseLabels[type]}
                    </Button>
                  );
                })}
              </div>
              <div className="space-y-3">
                {phases.map((phase, index) => (
                  <div key={phase.id} className="rounded-xl border border-border bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="flex-1">
                        <Input value={phase.name} disabled={settingsLocked} onChange={(event) => updatePhaseName(phase.id, event.target.value)} />
                        <p className="mt-2 text-sm text-slate-500">
                          {phaseLabels[phase.type]} · receives {phase.inputTeams ?? 0} teams · outputs {phase.outputTeams ?? 0} teams
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={settingsLocked || index === 0} onClick={() => movePhase(phase.id, "up")}>Up</Button>
                        <Button size="sm" variant="outline" disabled={settingsLocked || index === phases.length - 1} onClick={() => movePhase(phase.id, "down")}>Down</Button>
                        <Button size="sm" variant="outline" disabled={settingsLocked} onClick={() => removePhase(phase.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {currentStep === "rules" ? (
            <div className="space-y-6">
              {phases.map((phase) => (
                <Card key={phase.id} className="border border-border bg-slate-50 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
                    <p className="text-sm text-slate-500">
                      Input {phase.inputTeams ?? 0} · Output {phase.outputTeams ?? 0}
                    </p>
                  </div>
                  {phase.groupSettings ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <NumberField label="Groups" value={phase.groupSettings.groupCount} min={1} max={Math.max(1, phase.inputTeams ?? 1)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, groupCount: value } }))} />
                      <NumberField label="Teams per group" value={phase.groupSettings.teamsPerGroup} min={1} max={Math.max(1, phase.inputTeams ?? 1)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, teamsPerGroup: value } }))} />
                      <SelectField label="Allow uneven groups" value={phase.groupSettings.allowUnevenGroups ? "Yes" : "No"} locked={settingsLocked} options={["No", "Yes"]} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, allowUnevenGroups: value === "Yes" } }))} />
                      <NumberField label="Qualifiers per group" value={phase.groupSettings.qualifiersPerGroup} min={0} max={phase.groupSettings.teamsPerGroup} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, qualifiersPerGroup: value } }))} />
                      <NumberField label="Best second-place teams" value={phase.groupSettings.bestSecondPlaceCount} min={0} max={phase.groupSettings.groupCount} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, bestSecondPlaceCount: value } }))} />
                      <NumberField label="Best third-place teams" value={phase.groupSettings.bestThirdPlaceCount} min={0} max={phase.groupSettings.groupCount} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, bestThirdPlaceCount: value } }))} />
                      <PointsEditor label="Scoring" points={phase.groupSettings.points} locked={settingsLocked} onChange={(points) => updatePhase(phase.id, (current) => ({ ...current, groupSettings: { ...current.groupSettings!, points } }))} />
                      <TieBreakerEditor phase={phase} locked={settingsLocked} moveTieBreaker={moveTieBreaker} toggleTieBreaker={toggleTieBreaker} />
                      <CustomColumnEditor phase={phase} locked={settingsLocked} addCustomColumn={addCustomColumn} updateCustomColumn={updateCustomColumn} removeCustomColumn={removeCustomColumn} />
                    </div>
                  ) : null}
                  {phase.leagueSettings ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <NumberField label="Rounds" value={phase.leagueSettings.rounds} min={1} max={6} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, rounds: value } }))} />
                      <NumberField label="Playoff spots" value={phase.leagueSettings.playoffSpots} min={2} max={Math.max(2, phase.inputTeams ?? 2)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, playoffSpots: value } }))} />
                      <PointsEditor label="Scoring" points={phase.leagueSettings.points} locked={settingsLocked} onChange={(points) => updatePhase(phase.id, (current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, points } }))} />
                      <TieBreakerEditor phase={phase} locked={settingsLocked} moveTieBreaker={moveTieBreaker} toggleTieBreaker={toggleTieBreaker} />
                      <CustomColumnEditor phase={phase} locked={settingsLocked} addCustomColumn={addCustomColumn} updateCustomColumn={updateCustomColumn} removeCustomColumn={removeCustomColumn} />
                    </div>
                  ) : null}
                  {phase.swissSettings ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <NumberField label="Rounds" value={phase.swissSettings.rounds} min={1} max={Math.max(1, (phase.inputTeams ?? 2) + 1)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, swissSettings: { ...current.swissSettings!, rounds: value } }))} />
                      <NumberField label="Advancing teams" value={phase.swissSettings.advancingTeams} min={2} max={Math.max(2, phase.inputTeams ?? 2)} locked={settingsLocked} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, swissSettings: { ...current.swissSettings!, advancingTeams: value } }))} />
                      <SelectField label="Allow byes" value={phase.swissSettings.allowByes ? "Yes" : "No"} locked={settingsLocked} options={["No", "Yes"]} onChange={(value) => updatePhase(phase.id, (current) => ({ ...current, swissSettings: { ...current.swissSettings!, allowByes: value === "Yes" } }))} />
                      <PointsEditor label="Scoring" points={phase.swissSettings.points} locked={settingsLocked} onChange={(points) => updatePhase(phase.id, (current) => ({ ...current, swissSettings: { ...current.swissSettings!, points } }))} />
                      <TieBreakerEditor phase={phase} locked={settingsLocked} moveTieBreaker={moveTieBreaker} toggleTieBreaker={toggleTieBreaker} />
                      <CustomColumnEditor phase={phase} locked={settingsLocked} addCustomColumn={addCustomColumn} updateCustomColumn={updateCustomColumn} removeCustomColumn={removeCustomColumn} />
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
          ) : null}

          {currentStep === "seeding" ? (
            <div className="space-y-6">
              {phases.filter((phase) => phase.type === "groups").map((phase) => (
                <Card key={phase.id} className="border border-border bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
                      <p className="text-sm text-slate-500">Randomize first, then move teams only where capacity allows.</p>
                    </div>
                    <Button variant="outline" disabled={settingsLocked} onClick={() => randomizeGroups(phase.id)}>
                      <Shuffle className="mr-2 h-4 w-4" />
                      Randomize
                    </Button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    {(phase.groupAssignments ?? []).map((group, groupIndex) => (
                      <div key={`${phase.id}-${groupIndex}`} className="rounded-xl bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="font-semibold text-slate-900">{`Group ${String.fromCharCode(65 + groupIndex)}`}</p>
                          <Badge>{group.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {group.map((teamId) => {
                            const team = teams.find((entry) => entry.id === teamId);
                            if (!team) return null;
                            return (
                              <div key={teamId} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: team.color }} />
                                    <span className="font-medium text-slate-900">{team.name}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" disabled={settingsLocked || groupIndex === 0} onClick={() => moveTeamBetweenGroups(phase.id, groupIndex, teamId, "left")}>
                                      <MoveHorizontal className="h-4 w-4 rotate-180" />
                                    </Button>
                                    <Button size="sm" variant="outline" disabled={settingsLocked || groupIndex === (phase.groupAssignments?.length ?? 1) - 1} onClick={() => moveTeamBetweenGroups(phase.id, groupIndex, teamId, "right")}>
                                      <MoveHorizontal className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {currentStep === "review" ? (
            <div className="space-y-4">
              <Card className="bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Tournament review</p>
                <p className="mt-1 text-sm text-slate-500">Check the full structure before starting. Every phase shows the teams it receives and passes on.</p>
              </Card>
              {phases.map((phase, index) => (
                <div key={phase.id} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{phase.name}</p>
                      <p className="text-sm text-slate-500">{phaseLabels[phase.type]}</p>
                    </div>
                    <Badge tone="blue">{`Phase ${index + 1}`}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">Receives {phase.inputTeams ?? 0} teams and outputs {phase.outputTeams ?? 0} teams.</p>
                </div>
              ))}
            </div>
          ) : null}

          {currentStep === "start" ? (
            <div className="space-y-4">
              <Card className="bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Ready to start</p>
                <p className="mt-1 text-sm text-slate-500">Starting locks the structure. Results entry stays available, but structural settings require an explicit unlock later.</p>
              </Card>
              <div className="flex justify-end">
                <Button
                  disabled={!stepValidations.start.valid || settingsLocked}
                  onClick={() => {
                    startTournament();
                    navigate("/dashboard");
                  }}
                >
                  Start Tournament
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={!prevStep} onClick={() => prevStep && setCurrentStep(prevStep.key)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="text-sm text-slate-500">{!currentValidation.valid && currentValidation.message ? currentValidation.message : "Current step is valid."}</div>
            <Button disabled={!nextStep || !canGoNext} onClick={() => nextStep && setCurrentStep(nextStep.key)}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TeamEditor({ team, index, locked, onUpdate }: { team: Team; index: number; locked: boolean; onUpdate: (updater: (team: Team) => Team) => void }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Badge>{index + 1}</Badge>
        <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: team.color }} />
      </div>
      <div className="space-y-3">
        <Input value={team.name} disabled={locked} onChange={(event) => onUpdate((current) => ({ ...current, name: event.target.value }))} />
        <Input value={team.abbreviation} disabled={locked} onChange={(event) => onUpdate((current) => ({ ...current, abbreviation: event.target.value }))} />
        <Input type="color" value={team.color} disabled={locked} onChange={(event) => onUpdate((current) => ({ ...current, color: event.target.value }))} />
      </div>
    </div>
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
    <div className="rounded-xl border border-border bg-white p-3 md:col-span-2">
      <p className="mb-2 text-sm font-medium text-slate-700">Tie breakers</p>
      <div className="space-y-2">
        {tieBreakers.map((tieBreaker, index) => (
          <div key={tieBreaker.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={tieBreaker.enabled} disabled={locked} onChange={() => toggleTieBreaker(phase.id, tieBreaker.id)} />
              <span className="text-sm font-medium text-slate-900">{tieBreaker.label}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={locked || index === 0} onClick={() => moveTieBreaker(phase.id, tieBreaker.id, "up")}>Up</Button>
              <Button size="sm" variant="outline" disabled={locked || index === tieBreakers.length - 1} onClick={() => moveTieBreaker(phase.id, tieBreaker.id, "down")}>Down</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div className="rounded-xl border border-border bg-white p-3 md:col-span-2 xl:col-span-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">Custom standings columns</p>
        <div className="flex flex-wrap gap-2">
          {customColumnTypes.map((type) => (
            <Button key={type} size="sm" variant="outline" disabled={locked} onClick={() => addCustomColumn(phase.id, type)}>
              <Plus className="mr-2 h-4 w-4" />
              {type}
            </Button>
          ))}
        </div>
      </div>
      {columns.length === 0 ? <p className="text-sm text-slate-500">No custom columns added for this phase.</p> : null}
      <div className="space-y-3">
        {columns.map((column) => (
          <div key={column.id} className="grid gap-3 rounded-lg border border-border bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-6">
            <Input value={column.name} disabled={locked} onChange={(event) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, name: event.target.value }))} />
            <SelectField label="Type" value={column.type} locked={locked} options={customColumnTypes} onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, type: value as CustomColumn["type"] }))} />
            <SelectField label="Entry" value={column.entryMode} locked={locked} options={["manual", "auto"]} onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, entryMode: value as CustomColumn["entryMode"] }))} />
            <SelectField label="Affects ranking" value={column.affectsRanking ? "Yes" : "No"} locked={locked} options={["No", "Yes"]} onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, affectsRanking: value === "Yes" }))} />
            {(column.type === "number" || column.type === "percentage") ? (
              <>
                <SelectField label="Ranking direction" value={column.rankingDirection ?? "higher"} locked={locked} options={["higher", "lower"]} onChange={(value) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, rankingDirection: value as CustomColumn["rankingDirection"] }))} />
                <Input value={String(column.defaultValue ?? 0)} disabled={locked} onChange={(event) => updateCustomColumn(phase.id, column.id, (current) => ({ ...current, defaultValue: Number(event.target.value) }))} />
              </>
            ) : null}
            <Button size="sm" variant="outline" disabled={locked} onClick={() => removeCustomColumn(phase.id, column.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
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

function SelectField({ label, value, locked, options, onChange }: { label: string; value: string; locked: boolean; options: string[]; onChange: (value: string) => void }) {
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
  label,
  points,
  locked,
  onChange,
}: {
  label: string;
  points: { win: number; draw: number; loss: number };
  locked: boolean;
  onChange: (points: { win: number; draw: number; loss: number }) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 md:col-span-2">
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="number" value={points.win} disabled={locked} onChange={(event) => onChange({ ...points, win: Number(event.target.value) })} />
        <Input type="number" value={points.draw} disabled={locked} onChange={(event) => onChange({ ...points, draw: Number(event.target.value) })} />
        <Input type="number" value={points.loss} disabled={locked} onChange={(event) => onChange({ ...points, loss: Number(event.target.value) })} />
      </div>
    </div>
  );
}
