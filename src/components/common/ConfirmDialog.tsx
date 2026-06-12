import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Reusable confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()} className="max-w-sm">
      <DialogHeader title={title} description={description} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={danger ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>
          {pending ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
