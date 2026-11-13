import type { Metadata } from "next";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Read and write any customer's Tally</h1>
      <p className="mb-6 text-sm text-muted-foreground">Create an account to connect your first company. No TDL required.</p>
      <SignupForm />
    </>
  );
}
