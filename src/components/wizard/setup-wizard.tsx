import { type ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowRight, Plus, Shuffle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTournamentStore } from "@/store/use-tournament-store";
import type { Phase, PhaseType, Team, TieBreaker } from "@/lib/types";

const infoSchema = z.object({
  name: z.string().min(3, "Tournament name is required"),
  description: z.string().optional(),
  logo: z.string().optional(),
  participantCount: z.number().min(2).max(128),
});

type InfoValues = z.infer<typeof infoSchema>;

const phaseTypeLabels: Record<PhaseType, string> = {
  groups: "Group stage",
  swiss: "Swiss phase",
  league: "League phase",
  knockout: "Knockout phase",
};

const tieBreakers: TieBreaker[] = [
  "Goal difference",
  "Goals scored",
  "Goals conceded",
  "Head-to-head",
  "Wins",
  "Fair play",
  "Random draw",
];

const wizardSteps = [
  { title: "Tournament Info", description: "Event identity and participant count." },
  { title: "Format Builder", description: "Phases, rules, and validation." },
  { title: "Teams", description: "Teams, groups, and final review." },
];

export function SetupWizard() {
  const navigate = useNavigate();
  const {
    info,
    phases,
    teams,
    validationWarnings,
    settingsLocked,
    wizardStep,
    hasStarted,
    updateInfo,
    setParticipantCount,
    addPhase,
    removePhase,
    movePhase,
    updatePhaseName,
    updatePhase,
    setWizardStep,
    addTeam,
    updateTeam,
    randomizeGroups,
    moveTeamBetweenGroups,
    startTournament,
  } = useTournamentStore();

  const form = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: info,
  });

  const canContinue = useMemo(() => {
    if (wizardStep === 0) return form.getValues("name").length >= 3;
    if (wizardStep === 1) return phases.length > 0;
    return teams.length === info.participantCount;
  }, [form, info.participantCount, phases.length, teams.length, wizardStep]);

  const onSubmitInfo = form.handleSubmit((values) => {
    updateInfo({
      name: values.name,
      description: values.description ?? "",
      logo: values.logo ?? "",
      participantCount: values.participantCount,
    });
    setParticipantCount(values.participantCount);
    setWizardStep(1);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit p-4">
        <div className="space-y-3">
          {wizardSteps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setWizardStep(index)}
              className={`w-full rounded-xl px-4 py-3 text-left transition ${
                wizardStep === index ? "bg-primary text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <p className="text-sm font-semibold">{step.title}</p>
              <p className={`mt-1 text-xs ${wizardStep === index ? "text-blue-100" : "text-slate-500"}`}>{step.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <motion.div key={wizardStep} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {validationWarnings.length > 0 ? (
          <Card className="mb-6 border border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Configuration warnings</p>
                <div className="mt-2 space-y-1 text-sm text-amber-800">
                  {validationWarnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {wizardStep === 0 ? (
          <Card className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Start with the tournament basics</h2>
              <p className="mt-2 text-sm text-slate-500">Set the event identity and participant count before shaping phases and seeding rules.</p>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmitInfo}>
              <Field label="Tournament name">
                <Input placeholder="Continental Cup 2026" {...form.register("name")} disabled={settingsLocked} />
              </Field>
              <Field label="Participants">
                <Input
                  type="number"
                  min={2}
                  max={128}
                  disabled={settingsLocked}
                  {...form.register("participantCount", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Logo URL" className="md:col-span-2">
                <Input placeholder="https://..." {...form.register("logo")} disabled={settingsLocked} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea placeholder="Optional tournament summary" {...form.register("description")} disabled={settingsLocked} />
              </Field>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={settingsLocked}>
                  Continue to format
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {wizardStep === 1 ? (
          <div className="space-y-6">
            <Card className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Build the tournament flow</h2>
                  <p className="mt-2 text-sm text-slate-500">Add, remove, and reorder phases. Each phase only exposes the settings relevant to its format.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["groups", "league", "swiss", "knockout"] as PhaseType[]).map((type) => (
                    <Button key={type} variant="secondary" disabled={settingsLocked} onClick={() => addPhase(type)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {phaseTypeLabels[type]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {phases.map((phase, index) => (
                  <PhaseEditor
                    key={phase.id}
                    phase={phase}
                    index={index}
                    locked={settingsLocked}
                    onRename={(name) => updatePhaseName(phase.id, name)}
                    onMoveUp={() => movePhase(phase.id, "up")}
                    onMoveDown={() => movePhase(phase.id, "down")}
                    onRemove={() => removePhase(phase.id)}
                    onUpdate={(updater) => updatePhase(phase.id, updater)}
                  />
                ))}
              </div>
            </Card>
            <div className="flex justify-end">
              <Button onClick={() => setWizardStep(2)} disabled={!canContinue}>
                Continue to teams
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {wizardStep === 2 ? (
          <div className="space-y-6">
            <Card className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Finalize teams and seeding</h2>
                  <p className="mt-2 text-sm text-slate-500">Teams remain fully editable until the tournament starts. Group stages can randomize teams first, then move teams manually.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={settingsLocked} onClick={() => phases.filter((phase) => phase.type === "groups").forEach((phase) => randomizeGroups(phase.id))}>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Randomize groups
                  </Button>
                  <Button disabled={settingsLocked} onClick={() => addTeam()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add team
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {teams.map((team, index) => (
                  <TeamEditor key={team.id} team={team} index={index} locked={settingsLocked} onUpdate={(updater) => updateTeam(team.id, updater)} />
                ))}
              </div>
            </Card>

            {phases.filter((phase) => phase.type === "groups").map((phase) => (
              <Card key={phase.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{phase.name} assignments</h3>
                    <p className="text-sm text-slate-500">Random generation happens first. Use move buttons to manually shift teams between groups while keeping group sizes valid.</p>
                  </div>
                  <Button variant="outline" disabled={settingsLocked} onClick={() => randomizeGroups(phase.id)}>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Re-randomize
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  {(phase.groupAssignments ?? []).map((group, groupIndex) => (
                    <div key={`${phase.id}-${groupIndex}`} className="rounded-xl border border-border bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{`Group ${String.fromCharCode(65 + groupIndex)}`}</p>
                        <Badge>{`${group.length}/${phase.groupSettings?.teamsPerGroup ?? 0}`}</Badge>
                      </div>
                      <div className="space-y-2">
                        {group.map((teamId) => {
                          const team = teams.find((entry) => entry.id === teamId);
                          if (!team) return null;
                          return (
                            <div key={teamId} className="rounded-xl bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: team.color }} />
                                  <div>
                                    <p className="font-medium text-slate-900">{team.name}</p>
                                    <p className="text-xs text-slate-500">{team.abbreviation}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" disabled={settingsLocked || groupIndex === 0} onClick={() => moveTeamBetweenGroups(phase.id, groupIndex, teamId, "left")}>
                                    ←
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={settingsLocked || groupIndex === (phase.groupAssignments?.length ?? 1) - 1}
                                    onClick={() => moveTeamBetweenGroups(phase.id, groupIndex, teamId, "right")}
                                  >
                                    →
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

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {hasStarted ? (
                <Button onClick={() => navigate("/dashboard")}>Open dashboard</Button>
              ) : (
                <Button
                  onClick={() => {
                    startTournament();
                    navigate("/dashboard");
                  }}
                  disabled={!canContinue || validationWarnings.length > 0}
                >
                  Start Tournament
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </motion.div>
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

function PhaseEditor({
  phase,
  index,
  locked,
  onRename,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdate,
}: {
  phase: Phase;
  index: number;
  locked: boolean;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdate: (updater: (phase: Phase) => Phase) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <Input value={phase.name} disabled={locked} onChange={(event) => onRename(event.target.value)} />
          <p className="mt-2 text-sm text-slate-500">{phaseTypeLabels[phase.type]} · estimated incoming teams: {phase.estimatedTeams ?? 0}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="blue">{`Phase ${index + 1}`}</Badge>
          <Button size="sm" variant="outline" disabled={locked} onClick={onMoveUp}>Up</Button>
          <Button size="sm" variant="outline" disabled={locked} onClick={onMoveDown}>Down</Button>
          <Button size="sm" variant="outline" disabled={locked} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {phase.groupSettings ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LabeledNumber label="Groups" value={phase.groupSettings.groupCount} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, groupSettings: { ...current.groupSettings!, groupCount: value } }))} />
          <LabeledNumber label="Teams per group" value={phase.groupSettings.teamsPerGroup} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, groupSettings: { ...current.groupSettings!, teamsPerGroup: value } }))} />
          <LabeledNumber label="Qualifiers per group" value={phase.groupSettings.qualifiersPerGroup} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, groupSettings: { ...current.groupSettings!, qualifiersPerGroup: value } }))} />
          <LabeledNumber label="Best second-place teams" value={phase.groupSettings.bestSecondPlaceCount} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, groupSettings: { ...current.groupSettings!, bestSecondPlaceCount: value } }))} />
          <LabeledNumber label="Best third-place teams" value={phase.groupSettings.bestThirdPlaceCount} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, groupSettings: { ...current.groupSettings!, bestThirdPlaceCount: value } }))} />
          <PointsEditor label="Group points" value={phase.groupSettings.points} locked={locked} onChange={(points) => onUpdate((current) => ({ ...current, groupSettings: { ...current.groupSettings!, points } }))} />
          <TieBreakerEditor
            selected={phase.groupSettings.tieBreakers}
            locked={locked}
            onToggle={(tieBreaker) =>
              onUpdate((current) => ({
                ...current,
                groupSettings: {
                  ...current.groupSettings!,
                  tieBreakers: current.groupSettings!.tieBreakers.includes(tieBreaker)
                    ? current.groupSettings!.tieBreakers.filter((entry) => entry !== tieBreaker)
                    : [...current.groupSettings!.tieBreakers, tieBreaker],
                },
              }))
            }
          />
        </div>
      ) : null}

      {phase.leagueSettings ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LabeledNumber label="League rounds" value={phase.leagueSettings.rounds} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, rounds: value } }))} />
          <LabeledNumber label="Playoff spots" value={phase.leagueSettings.playoffSpots} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, playoffSpots: value } }))} />
          <LabeledNumber label="Promotion" value={phase.leagueSettings.promotion} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, promotion: value } }))} />
          <LabeledNumber label="Relegation" value={phase.leagueSettings.relegation} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, relegation: value } }))} />
          <PointsEditor label="League points" value={phase.leagueSettings.points} locked={locked} onChange={(points) => onUpdate((current) => ({ ...current, leagueSettings: { ...current.leagueSettings!, points } }))} />
        </div>
      ) : null}

      {phase.swissSettings ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LabeledNumber label="Swiss rounds" value={phase.swissSettings.rounds} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, swissSettings: { ...current.swissSettings!, rounds: value } }))} />
          <BooleanSelect label="Allow byes" value={phase.swissSettings.allowByes} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, swissSettings: { ...current.swissSettings!, allowByes: value } }))} />
          <SelectField
            label="Pairing"
            value={phase.swissSettings.pairing}
            locked={locked}
            options={["Standard Swiss", "Accelerated Swiss"]}
            onChange={(value) => onUpdate((current) => ({ ...current, swissSettings: { ...current.swissSettings!, pairing: value as "Standard Swiss" | "Accelerated Swiss" } }))}
          />
          <PointsEditor label="Swiss points" value={phase.swissSettings.points} locked={locked} onChange={(points) => onUpdate((current) => ({ ...current, swissSettings: { ...current.swissSettings!, points } }))} />
        </div>
      ) : null}

      {phase.knockoutSettings ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="Knockout type"
            value={phase.knockoutSettings.format}
            locked={locked}
            options={["Single Elimination", "Double Elimination"]}
            onChange={(value) => onUpdate((current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, format: value as "Single Elimination" | "Double Elimination" } }))}
          />
          <SelectField
            label="Best of"
            value={String(phase.knockoutSettings.bestOf)}
            locked={locked}
            options={["1", "3", "5", "7"]}
            onChange={(value) => onUpdate((current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, bestOf: Number(value) as 1 | 3 | 5 | 7 } }))}
          />
          <SelectField
            label="Seeding"
            value={phase.knockoutSettings.seeding}
            locked={locked}
            options={["Ranked", "Random Draw", "Manual"]}
            onChange={(value) => onUpdate((current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, seeding: value as "Ranked" | "Random Draw" | "Manual" } }))}
          />
          <BooleanSelect label="Allow byes" value={phase.knockoutSettings.allowByes} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, allowByes: value } }))} />
          <BooleanSelect label="Third place match" value={phase.knockoutSettings.thirdPlaceMatch} locked={locked} onChange={(value) => onUpdate((current) => ({ ...current, knockoutSettings: { ...current.knockoutSettings!, thirdPlaceMatch: value } }))} />
        </div>
      ) : null}
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

function LabeledNumber({ label, value, locked, onChange }: { label: string; value: number; locked: boolean; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" value={value} disabled={locked} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}

function BooleanSelect({ label, value, locked, onChange }: { label: string; value: boolean; locked: boolean; onChange: (value: boolean) => void }) {
  return <SelectField label={label} value={value ? "Yes" : "No"} locked={locked} options={["Yes", "No"]} onChange={(next) => onChange(next === "Yes")} />;
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
  value,
  locked,
  onChange,
}: {
  label: string;
  value: { win: number; draw: number; loss: number };
  locked: boolean;
  onChange: (points: { win: number; draw: number; loss: number }) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 md:col-span-2">
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="number" value={value.win} disabled={locked} onChange={(event) => onChange({ ...value, win: Number(event.target.value) })} />
        <Input type="number" value={value.draw} disabled={locked} onChange={(event) => onChange({ ...value, draw: Number(event.target.value) })} />
        <Input type="number" value={value.loss} disabled={locked} onChange={(event) => onChange({ ...value, loss: Number(event.target.value) })} />
      </div>
    </div>
  );
}

function TieBreakerEditor({ selected, locked, onToggle }: { selected: TieBreaker[]; locked: boolean; onToggle: (tieBreaker: TieBreaker) => void }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 md:col-span-2">
      <p className="mb-2 text-sm font-medium text-slate-700">Tie breakers</p>
      <div className="flex flex-wrap gap-2">
        {tieBreakers.map((tieBreaker) => (
          <button
            key={tieBreaker}
            type="button"
            disabled={locked}
            onClick={() => onToggle(tieBreaker)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selected.includes(tieBreaker) ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {tieBreaker}
          </button>
        ))}
      </div>
    </div>
  );
}
