import { BrowserAccountBoundary } from "@/components/browser-account-boundary";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <BrowserAccountBoundary mode="auth"><AuthShell mode="login"><LoginForm /></AuthShell></BrowserAccountBoundary>;
}
