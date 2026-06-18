import { BestiaryPanel } from "@/components/bestiary/BestiaryPanel";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = { title: "Bestiaire — Zaap Builder" };

export default function BestiairePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <BestiaryPanel />
    </div>
  );
}
