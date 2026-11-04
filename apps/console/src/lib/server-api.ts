/** Reads the session on the server, so a signed-out visitor is redirected before any page renders. */
import { cookies } from "next/headers";
import type { Profile } from "./api";

export async function getProfile(): Promise<Profile | null> {
  const session = (await cookies()).get("hx_session");
  if (!session) return null;
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/console/v1/me`, { headers: { cookie: `hx_session=${session.value}` }, cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`The API answered ${res.status}`);
  return (await res.json()) as Profile;
}
