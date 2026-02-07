import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorksheetDashboard } from "@/components/dashboard/worksheet-dashboard";

export default function Home() {
  return (
    <DashboardLayout>
      <WorksheetDashboard />
    </DashboardLayout>
  );
}
