import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paschalidis - Sign Up",
};

export default function SignUp() {
  return <SignUpForm />;
}
