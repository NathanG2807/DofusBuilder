import { AtelierPanel } from "@/components/atelier/AtelierPanel";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = { title: "L'Atelier — Zaap Builder" };

export default function AtelierPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />
      <AtelierPanel />
    </div>
  );
}
