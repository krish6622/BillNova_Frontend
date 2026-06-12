import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product, ProductInput } from "@/features/products/types";

const schema = z.object({
  product_code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  category: z.string().optional(),
  unit: z.string().min(1, "Required"),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  gst_percentage: z.coerce.number().min(0).max(100),
  hsn_code: z.string().optional(),
  current_stock: z.coerce.number(),
  reorder_level: z.coerce.number().min(0),
});

type FormValues = z.input<typeof schema>;

const FIELDS: { name: keyof FormValues; label: string; type?: string }[] = [
  { name: "product_code", label: "Product Code" },
  { name: "name", label: "Product Name" },
  { name: "category", label: "Category" },
  { name: "unit", label: "Unit" },
  { name: "hsn_code", label: "HSN Code" },
  { name: "purchase_price", label: "Purchase Price", type: "number" },
  { name: "selling_price", label: "Selling Price", type: "number" },
  { name: "gst_percentage", label: "GST %", type: "number" },
  { name: "current_stock", label: "Current Stock", type: "number" },
  { name: "reorder_level", label: "Reorder Level", type: "number" },
];

interface Props {
  initial?: Product;
  serverError?: string | null;
  submitting?: boolean;
  onSubmit: (values: ProductInput) => void;
  onCancel: () => void;
}

export function ProductForm({ initial, serverError, submitting, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_code: initial?.product_code ?? "",
      name: initial?.name ?? "",
      category: initial?.category ?? "",
      unit: initial?.unit ?? "PCS",
      hsn_code: initial?.hsn_code ?? "",
      purchase_price: initial?.purchase_price ?? 0,
      selling_price: initial?.selling_price ?? 0,
      gst_percentage: initial?.gst_percentage ?? 0,
      current_stock: initial?.current_stock ?? 0,
      reorder_level: initial?.reorder_level ?? 0,
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => {
      const parsed = schema.parse(v);
      onSubmit({ ...parsed, category: parsed.category || null, hsn_code: parsed.hsn_code || null });
    })} className="space-y-4">
      <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
        {FIELDS.map((f) => (
          <div key={f.name} className="space-y-1">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input
              id={f.name}
              type={f.type ?? "text"}
              step={f.type === "number" ? "any" : undefined}
              disabled={f.name === "product_code" && !!initial}
              {...register(f.name)}
            />
            {errors[f.name] && <p className="text-xs text-destructive">{errors[f.name]?.message}</p>}
          </div>
        ))}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
