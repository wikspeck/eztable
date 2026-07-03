import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, GripVertical, Plus, Shuffle, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTournamentStore } from "@/store/use-tournament-store";
import type { Phase, PhaseType } from "@/lib/types";

const infoSchema = z.object({
  name: z.string().min(3, "Tournament name is required"),
  description: z.string().optional(),
  logo: z.string().optional(),
});

type InfoValues = z.infer<typeof infoSchema>;

const phaseTypeLabels: Record<PhaseType, string> = {
  groups: "Groups",
  swiss: "Swiss",
  league: "League",
  knockout: "Knockout",
};

const wizardSteps = [
  { title: "Tournament Info", description: "Name, logo, and positioning." },
  { title: "Format Builder", description: "Unlimited phases with reordering." },
  { title: "Teams", description: "Roster input and import-ready tooling." },
];

function createPhase(type: PhaseType, index: number): Phase {
  return {
    id: `phase-${type}-${Date.now()}-${index}`,
    name: `${phaseTypeLabels[type]} Phase`,
    type,
  };
}

export function SetupWizard() {
  const navigate = useNavigate();
  const { info, phases, teams, updateInfo, addPhase, movePhase, wizardStep, setWizardStep, addTeam } =
    useTournamentStore();
  const form = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: info,
  });

  const canContinue = useMemo(() => {
    if (wizardStep === 0) {
      return form.formState.isValid || form.getValues("name").length >= 3;
    }
    if (wizardStep === 1) {
      return phases.length > 0;
    }
    return teams.length > 0;
  }, [form, phases.length, teams.length, wizardStep]);

  const onSubmitInfo = form.handleSubmit((values) => {
    updateInfo({
      name: values.name,
      description: values.description ?? "",
      logo: values.logo ?? "",
    });
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
              <p className={`mt-1 text-xs ${wizardStep === index ? "text-blue-100" : "text-slate-500"}`}>
                {step.description}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <motion.div
        key={wizardStep}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {wizardStep === 0 ? (
          <Card className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Start with the essentials</h2>
              <p className="mt-2 text-sm text-slate-500">
                Keep setup tight: define the event identity first, then move directly into structure and teams.
              </p>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmitInfo}>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Tournament name</label>
                <Input placeholder="Continental Cup 2026" {...form.register("name")} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Logo URL</label>
                <Input placeholder="https://..." {...form.register("logo")} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <Textarea placeholder="Optional tournament summary" {...form.register("description")} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">
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
                  <h2 className="text-2xl font-bold text-slate-900">Build any competition flow</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Mix group stages, Swiss rounds, leagues, and brackets. Reorder phases to mirror the exact event format.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["groups", "swiss", "league", "knockout"] as PhaseType[]).map((type, index) => (
                    <Button key={type} variant="secondary" onClick={() => addPhase(createPhase(type, index))}>
                      <Plus className="mr-2 h-4 w-4" />
                      {phaseTypeLabels[type]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {phases.map((phase, index) => (
                  <div key={phase.id} className="flex flex-col gap-3 rounded-xl border border-border bg-slate-50 p-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-white p-2 text-slate-400">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{phase.name}</p>
                        <p className="text-sm text-slate-500">{phaseTypeLabels[phase.type]} configuration block</p>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge tone="blue">Phase {index + 1}</Badge>
                      <Button variant="outline" size="sm" onClick={() => movePhase(phase.id, "up")}>
                        Up
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => movePhase(phase.id, "down")}>
                        Down
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Group stage controls</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatField label="Groups" value="4" />
                  <StatField label="Teams per group" value="4" />
                  <StatField label="Assignment" value="Automatic or manual" />
                  <StatField label="Points" value="3 / 1 / 0" />
                  <StatField label="Home and away" value="Optional" />
                  <StatField label="Qualification" value="Winner + best placed teams" />
                </div>
              </Card>
              <Card className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Knockout controls</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatField label="Formats" value="Single or double elimination" />
                  <StatField label="Series length" value="BO1 / BO3 / BO5 / BO7" />
                  <StatField label="Third place match" value="Supported" />
                  <StatField label="Seeding" value="Ranked, manual, or random draw" />
                  <StatField label="Bracket editing" value="Manual override ready" />
                  <StatField label="Generation" value="Automatic connectors" />
                </div>
              </Card>
            </div>

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
                  <h2 className="text-2xl font-bold text-slate-900">Populate the field</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Add teams quickly, then manage ordering, CSV import, duplicates, or randomized seeding.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                  <Button variant="outline">
                    <Shuffle className="mr-2 h-4 w-4" />
                    Randomize
                  </Button>
                  <Button
                    onClick={() =>
                      addTeam({
                        id: `team-${Date.now()}`,
                        name: `New Team ${teams.length + 1}`,
                        logo: "",
                        color: "#1769ff",
                        abbreviation: `T${teams.length + 1}`,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Team
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {teams.map((team, index) => (
                  <div key={team.id} className="rounded-xl border border-border bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl" style={{ backgroundColor: team.color }} />
                        <div>
                          <p className="font-semibold text-slate-900">{team.name}</p>
                          <p className="text-sm text-slate-500">{team.abbreviation}</p>
                        </div>
                      </div>
                      <Badge>{index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => navigate("/dashboard")} disabled={!canContinue}>
                Launch dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

function StatField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
