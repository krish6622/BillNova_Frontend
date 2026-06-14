import { KeyRound, UserPlus } from "lucide-react";
import { useState } from "react";

import { Async } from "@/components/common/Async";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import {
  type AppUser,
  useCreateUser,
  useResetPassword,
  useSetUserActive,
  useUsers,
} from "@/features/users/api";
import { getApiErrorMessage } from "@/lib/api";
import { roleLabel } from "@/lib/rbac";
import { useAuth } from "@/stores/auth";

/**
 * User management — Owner (Admin) only. The route is guarded by RequirePermission and
 * every endpoint here is Owner-gated on the backend. Staff users default to CASHIER.
 */
export default function Users() {
  const me = useAuth((s) => s.user);
  const { data, isLoading, isError } = useUsers();
  const createUser = useCreateUser();
  const setActive = useSetUserActive();
  const resetPassword = useResetPassword();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CASHIER" });
  const [error, setError] = useState<string | null>(null);
  const [toToggle, setToToggle] = useState<AppUser | null>(null);
  const [resetFor, setResetFor] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    createUser.mutate(form, {
      onSuccess: (u) => {
        setNotice(`User "${u.name}" created.`);
        setForm({ name: "", email: "", password: "", role: "CASHIER" });
      },
      onError: (err) => setError(getApiErrorMessage(err)),
    });
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage staff. New staff are Cashiers by default — billing access only.
        </p>
      </div>

      {/* Create staff */}
      <GlassCard className="mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <UserPlus className="h-4 w-4" /> Add Staff User
        </h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-9" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="h-9" />
          </Field>
          <Field label="Temp Password">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="h-9" />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="CASHIER">Cashier</option>
              <option value="OWNER">Admin (Owner)</option>
            </select>
          </Field>
          <Button type="submit" disabled={createUser.isPending} className="h-9">
            {createUser.isPending ? "Creating…" : "Create User"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {notice && <p className="mt-3 text-sm text-emerald-500">{notice}</p>}
      </GlassCard>

      {/* Staff list */}
      <Async isLoading={isLoading} isError={isError} isEmpty={!!data && data.length === 0}
        empty={<div className="p-10 text-center text-sm text-muted-foreground">No users yet.</div>}>
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data?.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <TR key={u.id}>
                    <TD className="font-medium">{u.name}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</TD>
                    <TD className="text-muted-foreground">{u.email}</TD>
                    <TD>
                      <span className={u.role === "OWNER"
                        ? "rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-400"
                        : "rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}>
                        {roleLabel(u.role)}
                      </span>
                    </TD>
                    <TD>
                      <span className={u.is_active
                        ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400"
                        : "rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"}>
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setResetFor(u); setNewPassword(""); }}>
                          <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset
                        </Button>
                        <Button
                          variant={u.is_active ? "destructive" : "secondary"}
                          size="sm"
                          disabled={isSelf}
                          title={isSelf ? "You cannot deactivate yourself" : undefined}
                          onClick={() => setToToggle(u)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Async>

      {/* Activate / deactivate */}
      <ConfirmDialog
        open={!!toToggle}
        title={toToggle?.is_active ? "Deactivate this user?" : "Activate this user?"}
        description={toToggle?.is_active
          ? "They will be signed out and unable to log in until reactivated."
          : "They will be able to log in again."}
        confirmLabel={toToggle?.is_active ? "Deactivate" : "Activate"}
        danger={!!toToggle?.is_active}
        pending={setActive.isPending}
        onConfirm={() => {
          if (!toToggle) return;
          setActive.mutate(
            { id: toToggle.id, is_active: !toToggle.is_active },
            { onSettled: () => setToToggle(null) },
          );
        }}
        onCancel={() => setToToggle(null)}
      />

      {/* Reset password */}
      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)} className="max-w-sm">
        <DialogHeader title={`Reset password — ${resetFor?.name ?? ""}`}
          description="Sets a new password and signs the user out of all sessions." />
        <Field label="New password">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} placeholder="At least 8 characters" />
        </Field>
        {resetPassword.isError && <p className="mt-2 text-sm text-destructive">{getApiErrorMessage(resetPassword.error)}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setResetFor(null)}>Cancel</Button>
          <Button
            disabled={resetPassword.isPending || newPassword.length < 8}
            onClick={() => {
              if (!resetFor) return;
              resetPassword.mutate(
                { id: resetFor.id, password: newPassword },
                { onSuccess: () => { setResetFor(null); setNotice("Password reset."); } },
              );
            }}
          >
            {resetPassword.isPending ? "Resetting…" : "Reset Password"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
