"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { ActionResult } from "@/lib/actions";

const PendingContext = createContext(false);

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  /** Si se pasa, pide confirmación antes de enviar (para borrar cosas). */
  confirm?: string;
  /** Mensaje a mostrar cuando la acción sale bien. */
  successMessage?: string;
  /** Vaciar los campos al guardar bien (sí para "agregar", no para "editar"). */
  resetOnSuccess?: boolean;
};

/**
 * Formulario que llama a una Server Action y muestra el error que devuelve
 * (monto inválido, falta un dato, etc.) sin perder lo que se escribió.
 *
 * Se envía a mano desde onSubmit en vez de con `<form action>` porque React
 * vacía el formulario después de cada acción, aunque haya fallado.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  successMessage,
  resetOnSuccess = true,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    successRef.current?.focus();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending || (confirm && !window.confirm(confirm))) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext value={pending}>{children}</PendingContext>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700 basis-full">
          {state.error}
        </p>
      )}
      {state?.ok && successMessage && (
        <p ref={successRef} tabIndex={-1} className="text-sm text-emerald-700 basis-full outline-none">
          {successMessage}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger" | "link-danger";
}) {
  const pending = useContext(PendingContext);
  const styles = {
    primary:
      "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60",
    danger:
      "rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60",
    "link-danger": "text-xs text-red-700 hover:underline disabled:opacity-60",
  };
  return (
    <button type="submit" disabled={pending} className={styles[variant]}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

/** Botoncito "Borrar" para una fila, con confirmación. */
export function DeleteButton({
  action,
  confirm = "¿Seguro que querés borrar esto?",
  label = "Borrar",
}: {
  action: () => Promise<ActionResult>;
  confirm?: string;
  label?: string;
}) {
  return (
    <ActionForm action={action} confirm={confirm} className="inline">
      <SubmitButton variant="link-danger">{label}</SubmitButton>
    </ActionForm>
  );
}
