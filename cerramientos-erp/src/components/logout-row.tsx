"use client";

import { signOut } from "next-auth/react";
import { Icon } from "@/components/icons";

export function LogoutRow() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
      className="flex w-full items-center gap-4 px-4 py-4 text-left text-red-700 hover:bg-surface"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
        <Icon name="logout" />
      </span>
      <span className="font-medium">Cerrar sesión</span>
    </button>
  );
}
