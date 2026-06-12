import { DashboardApp } from "@/components/dashboard/DashboardApp";

export const metadata = { title: "Buildroom — Zaap Builder" };

export default function BuilderPage() {
  return <DashboardApp initialTab="buildroom" />;
}
