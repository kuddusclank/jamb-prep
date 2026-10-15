import { AuthShell } from "../auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <AuthShell mode="register"><RegisterForm /></AuthShell>;
}
