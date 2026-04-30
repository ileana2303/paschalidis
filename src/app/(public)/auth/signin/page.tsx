import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Paschalidis - Sign In",
};

export default function SignIn() {
  return <SignInForm />;
}
