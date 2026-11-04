"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function SignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <Button
        variant="rail" size="bare" disabled={pending}
        onClick={async () => {
          setPending(true);
          setFailed(false);
          try {
            await api("/auth/logout", { method: "POST" });
            queryClient.clear();
            router.replace("/login");
            router.refresh();
          } catch {
            setFailed(true);
            setPending(false);
          }
        }}
      >
        Sign out
      </Button>
      {failed ? <p role="alert" className="mt-1 text-sm text-white">You're still signed in. Try again.</p> : null}
    </div>
  );
}
