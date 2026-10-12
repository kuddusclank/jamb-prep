import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log in — JAMBPrep",
  description: "Sign in to your JAMBPrep UTME study dashboard and mock simulator.",
};

export default function LoginPage() {
  return <AuthShell mode="login"><LoginForm /></AuthShell>;
}
