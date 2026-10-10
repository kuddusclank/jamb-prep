import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — JAMBPrep" };

export default function Page() {
  return <AuthShell mode="login"><LoginForm/></AuthShell>;
}
