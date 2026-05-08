import SignInForm from "@/components/auth/signin-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Paschalidis - Sign In",
};

export default function SignIn() {
  return <SignInForm />;
}
