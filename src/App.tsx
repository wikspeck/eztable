import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { SetupWizard } from "@/components/wizard/setup-wizard";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell
            title="Build complex tournaments without friction"
            subtitle="Create flexible competition structures, enter results quickly, and track standings, brackets, and statistics from a single local-first workspace."
          >
            <SetupWizard />
          </AppShell>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AppShell
            title="Tournament Dashboard"
            subtitle="Overview, matches, standings, bracket, teams, statistics, and settings in one responsive control surface."
          >
            <DashboardPage />
          </AppShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
