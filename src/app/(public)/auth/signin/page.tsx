import SignInForm from "@/components/auth/signin-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Sign In | Oval",
};

export default function SignIn() {
  return <SignInForm />;
}

