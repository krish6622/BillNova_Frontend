import { useEffect, useState } from "react";

import { Async } from "@/components/common/Async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { type Settings as SettingsT, useSettings, useUpdateSettings } from "@/features/settings/api";
import { useCreateUser, useSetUserActive, useUsers } from "@/features/users/api";
import { getApiErrorMessage } from "@/lib/api";

export default function Settings() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Business profile, invoice preferences, and users.</p>
      </div>
      <BusinessSettings />
      <UserManagement />
    </div>
  );
}

function BusinessSettings() {
  const { data, isLoading, isError } = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<Partial<SettingsT>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = (k: keyof SettingsT, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setMsg(null);
    setError(null);
    try {
      await update.mutateAsync({
        business_name: form.business_name,
        owner_name: form.owner_name,
        mobile: form.mobile,
        gst_number: form.gst_number,
        address: form.address,
        place_of_supply: form.place_of_supply,
        gst_mode_default: form.gst_mode_default,
        invoice_prefix: form.invoice_prefix,
        invoice_footer: form.invoice_footer,
      });
      setMsg("Settings saved.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Async isLoading={isLoading} isError={isError}>
          <div className="grid max-w-2xl grid-cols-2 gap-4">
            <Text label="Business Name" value={form.business_name ?? ""} onChange={(v) => set("business_name", v)} />
            <Text label="Owner Name" value={form.owner_name ?? ""} onChange={(v) => set("owner_name", v)} />
            <Text label="Mobile" value={form.mobile ?? ""} onChange={(v) => set("mobile", v)} />
            <Text label="GST Number" value={form.gst_number ?? ""} onChange={(v) => set("gst_number", v)} />
            <Text label="Address" value={form.address ?? ""} onChange={(v) => set("address", v)} />
            <Select
              label="Default GST Mode"
              value={form.gst_mode_default ?? "inclusive"}
              options={[["inclusive", "Inclusive"], ["exclusive", "Exclusive"]]}
              onChange={(v) => set("gst_mode_default", v)}
            />
            <Select
              label="Place of Supply"
              value={form.place_of_supply ?? "intra"}
              options={[["intra", "Intra-state (CGST+SGST)"], ["inter", "Inter-state (IGST)"]]}
              onChange={(v) => set("place_of_supply", v)}
            />
            <Text label="Invoice Prefix" value={form.invoice_prefix ?? ""} onChange={(v) => set("invoice_prefix", v)} />
            <Text label="Invoice Footer" value={form.invoice_footer ?? ""} onChange={(v) => set("invoice_footer", v)} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={update.isPending} onClick={save}>
              {update.isPending ? "Saving…" : "Save Settings"}
            </Button>
            {msg && <span className="text-sm text-green-600">{msg}</span>}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </Async>
      </CardContent>
    </Card>
  );
}

function UserManagement() {
  const { data: users, isLoading, isError } = useUsers();
  const createUser = useCreateUser();
  const setActive = useSetUserActive();
  const [draft, setDraft] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setError(null);
    try {
      await createUser.mutateAsync({ ...draft, role: "CASHIER" });
      setDraft({ name: "", email: "", password: "" });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Async isLoading={isLoading} isError={isError}>
          <div className="rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Role</TH>
                  <TH className="text-right">Status</TH>
                </TR>
              </THead>
              <TBody>
                {users?.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium">{u.name}</TD>
                    <TD className="text-muted-foreground">{u.email}</TD>
                    <TD>{u.role}</TD>
                    <TD className="text-right">
                      {u.role === "OWNER" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Button
                          variant={u.is_active ? "outline" : "default"}
                          size="sm"
                          onClick={() => setActive.mutate({ id: u.id, is_active: !u.is_active })}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Async>

        <div className="flex max-w-2xl flex-wrap items-end gap-3">
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <Input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
          </Field>
          <Button disabled={createUser.isPending} onClick={add}>
            Add Cashier
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
