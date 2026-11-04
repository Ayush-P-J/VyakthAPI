/** Reads the session on the server, so a signed-out visitor is redirected before any page renders. */
import { cookies } from "next/headers";
import { cache } from "react";
import type { Profile } from "./api";

/** Cached per render, because a page and each layout above it all ask. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const session = (await cookies()).get("hx_session");
  if (!session) return null;
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/console/v1/me`, { headers: { cookie: `hx_session=${session.value}` }, cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`The API answered ${res.status}`);
  return (await res.json()) as Profile;
});
