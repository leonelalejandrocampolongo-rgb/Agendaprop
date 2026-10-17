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
        <p role="alert" className="col-span-full basis-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state?.ok && successMessage && (
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="col-span-full basis-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 outline-none"
        >
          {"✓ "}
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
      "w-full sm:w-auto rounded-lg bg-brand px-5 py-2.5 text-base sm:text-sm font-medium text-white shadow-sm hover:bg-brand-dark disabled:opacity-60",
    danger:
      "w-full sm:w-auto rounded-lg border border-red-300 bg-white px-5 py-2.5 text-base sm:text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60",
    "link-danger": "-mx-2 rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60",
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
