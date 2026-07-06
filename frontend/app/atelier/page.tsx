import { AtelierPanel } from "@/components/atelier/AtelierPanel";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = { title: "L'Atelier — Zaap Builder" };

export default function AtelierPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-4 mb-5 mt-5 min-h-0 flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-[#080807] md:mx-8 md:mt-6">
        <AtelierPanel />
      </div>
    </div>
  );
}
