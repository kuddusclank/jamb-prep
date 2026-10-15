import { BrowserAccountBoundary } from "@/components/browser-account-boundary";
import { AuthShell } from "../auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <BrowserAccountBoundary mode="auth"><AuthShell mode="register"><RegisterForm /></AuthShell></BrowserAccountBoundary>;
}
