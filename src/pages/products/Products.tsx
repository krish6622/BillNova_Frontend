import { useEffect, useState } from "react";

import { Async } from "@/components/common/Async";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/features/products/api";
import type { Product, ProductInput } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

import { ProductForm } from "./ProductForm";

const LIMIT = 10;

export default function Products() {
  const isOwner = useAuth((s) => s.user?.role === "OWNER");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useProducts({ search, page, limit: LIMIT });
  const createM = useCreateProduct();
  const updateM = useUpdateProduct();
  const deleteM = useDeleteProduct();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (values: ProductInput) => {
    setFormError(null);
    try {
      if (editing) await updateM.mutateAsync({ id: editing.id, input: values });
      else await createM.mutateAsync(values);
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteM.mutateAsync(toDelete.id);
    setToDelete(null);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const isEmpty = !!data && data.items.length === 0;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your catalog.</p>
        </div>
        {isOwner && <Button onClick={openCreate}>Add Product</Button>}
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by name, code, or HSN…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Async
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        errorMessage="Failed to load products."
        empty={<div className="rounded-lg border p-10 text-center text-muted-foreground">No products yet.</div>}
      >
        <div className="rounded-lg border">
          <Table>
            <THead>
              <TR>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Category</TH>
                <TH className="text-right">Selling</TH>
                <TH className="text-right">GST%</TH>
                <TH className="text-right">Stock</TH>
                {isOwner && <TH className="text-right">Actions</TH>}
              </TR>
            </THead>
            <TBody>
              {data?.items.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.product_code}</TD>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="text-muted-foreground">{p.category ?? "—"}</TD>
                  <TD className="text-right">{formatINR(p.selling_price)}</TD>
                  <TD className="text-right">{p.gst_percentage}%</TD>
                  <TD className="text-right">{p.current_stock}</TD>
                  {isOwner && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setToDelete(p)}>
                          Delete
                        </Button>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data?.total ?? 0} product(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Async>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogHeader title={editing ? "Edit Product" : "Add Product"} />
        <ProductForm
          initial={editing ?? undefined}
          serverError={formError}
          submitting={createM.isPending || updateM.isPending}
          onSubmit={submit}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} className="max-w-sm">
        <DialogHeader
          title="Delete product?"
          description={`"${toDelete?.name}" will be permanently removed.`}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={deleteM.isPending} onClick={confirmDelete}>
            {deleteM.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
