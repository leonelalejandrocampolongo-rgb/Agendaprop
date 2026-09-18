"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() =>
        signOut({ callbackUrl: `${window.location.origin}/admin/login` })
      }
      className="text-sm text-taupe hover:text-gold-dark"
    >
      Cerrar sesión
    </button>
  );
}
