import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = { title: "Réinitialiser le mot de passe — Zaap Builder" };

export default function ResetPassword() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <ResetPasswordPage />
    </div>
  );
}
