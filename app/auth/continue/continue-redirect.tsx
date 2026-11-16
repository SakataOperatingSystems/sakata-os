"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContinueRedirect({
  destination,
}: {
  destination: string;
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace(destination);
  }, [destination, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <p className="text-sm text-slate-400">
        Continuing to your SAKATA OS workspace...
      </p>
    </main>
  );
}
