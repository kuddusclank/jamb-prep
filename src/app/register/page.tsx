import { AuthShell } from "../auth-shell";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Create Your Free Account — JAMBPrep",
  description: "Create your JAMBPrep account to choose your subjects and start your UTME preparation.",
};

export default function RegisterPage() {
  return <AuthShell mode="register"><RegisterForm /></AuthShell>;
}
