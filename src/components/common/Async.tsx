import type { ReactNode } from "react";

interface AsyncProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  errorMessage?: string;
  loading?: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}

/**
 * Standard wrapper for data-bound views so every screen has consistent
 * loading / empty / error states (docs §UI Requirements, AC-J1).
 */
export function Async({
  isLoading,
  isError,
  isEmpty = false,
  errorMessage = "Failed to load data.",
  loading,
  empty,
  children,
}: AsyncProps) {
  if (isLoading) {
    return <>{loading ?? <div className="p-6 text-muted-foreground">Loading…</div>}</>;
  }
  if (isError) {
    return <div className="p-6 text-destructive">{errorMessage}</div>;
  }
  if (isEmpty) {
    return <>{empty ?? <div className="p-6 text-muted-foreground">Nothing here yet.</div>}</>;
  }
  return <>{children}</>;
}
