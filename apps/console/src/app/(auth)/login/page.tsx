import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-4xl leading-tight font-bold">Sign in</h1>
      <p className="mt-3 text-quiet">Manage your customers' Tally connections and API keys.</p>
      <LoginForm />
    </>
  );
}
