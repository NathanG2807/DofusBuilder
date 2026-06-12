import { DashboardApp } from "@/components/dashboard/DashboardApp";

export const metadata = { title: "Stuffs publics — Zaap Builder" };

export default function StuffsPage() {
  return <DashboardApp initialTab="stuffs" />;
}
