import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <AuthShell mode="login"><LoginForm /></AuthShell>;
}
