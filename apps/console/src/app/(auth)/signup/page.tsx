import type { Metadata } from "next";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-4xl leading-tight font-bold">Read and write any customer's Tally</h1>
      <p className="mt-3 text-quiet">Create an account to connect your first company. No TDL required.</p>
      <SignupForm />
    </>
  );
}
