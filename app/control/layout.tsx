import type { ReactNode } from "react";
import ThemeToggle from "@/app/components/theme-toggle";
import { requireControlPlaneAccess } from "@/app/lib/auth/authorization";

export default async function ControlPlaneLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireControlPlaneAccess();

  return (
    <>
      <div className="fixed right-4 top-4 z-[60]">
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}
