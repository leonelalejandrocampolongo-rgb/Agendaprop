"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
      className="text-sm text-steel hover:text-brand-dark"
    >
      Cerrar sesión
    </button>
  );
}
