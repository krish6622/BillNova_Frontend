import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

/**
 * 403 page shown when a user opens a route their role can't access (e.g. a cashier
 * navigating directly to /settings). The backend independently rejects the data
 * calls — this is the matching UI surface.
 */
export default function Forbidden() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldX className="h-8 w-8" />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">403 — Access Denied</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </div>
      <Link
        to="/"
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        )}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
