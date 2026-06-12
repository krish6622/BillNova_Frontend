/** Placeholder for routes implemented in later milestones (M2–M7). */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This module is implemented in a later Phase 1 milestone.
      </p>
    </div>
  );
}
