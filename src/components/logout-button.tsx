"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-sm text-stone-500 hover:text-amber-700"
    >
      Cerrar sesión
    </button>
  );
}
