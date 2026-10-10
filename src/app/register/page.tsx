import { AuthShell } from "../auth-shell";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create your account — JAMBPrep" };

export default function Page() {
  return <AuthShell mode="register"><RegisterForm/></AuthShell>;
}
