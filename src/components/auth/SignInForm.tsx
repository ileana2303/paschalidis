"use client";
import Checkbox from "@/components/template components/form/input/Checkbox";
import Input from "@/components/template components/form/input/InputField";
import Label from "@/components/template components/form/Label";
import Button from "@/components/ui/button/Button";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import type { ToastMessage } from "@/lib/auth/types";
import { useLoginMutation } from "@/hooks/queries/useAuthQueries";
import { useAuthStore } from "@/stores/authStore";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginMutation = useLoginMutation();
  const setUser = useAuthStore((state) => state.setUser);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data: ToastMessage = await loginMutation.mutateAsync({
        username,
        password,
        rememberMe: isChecked,
      });

      if (data.result) {
        setUser(data.userAccount ?? null);
        window.location.href = data.redirectlink ?? "/";
      } else {
        setError(data.message);
      }
    } catch {
      setError("Σφάλμα σύνδεσης, προσπαθήστε ξανά");
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Σύνδεση
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Εισάγετε τα στοιχεία σας για να συνδεθείτε
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {error && (
                  <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {error}
                  </div>
                )}
                <div>
                  <Label>
                    Επαγγελματικό email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    placeholder="Επαγγελματικό email"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label>
                    Κωδικός πρόσβασης <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Κωδικός πρόσβασης"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Να παραμείνω συνδεδεμένος
                    </span>
                  </div>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? "Σύνδεση..." : "Είσοδος στην πλατφόρμα"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Δεν έχετε λογαριασμό;{" "}
                <Link
                  href="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Εγγραφή
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
