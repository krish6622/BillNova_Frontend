import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Forbidden from "@/pages/Forbidden";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Inventory from "@/pages/inventory/Inventory";
import InvoiceRegister from "@/pages/invoices/InvoiceRegister";
import POS from "@/pages/pos/POS";
import Products from "@/pages/products/Products";
import Purchases from "@/pages/purchases/Purchases";
import Reports from "@/pages/reports/Reports";
import Settings from "@/pages/settings/Settings";
import Subscription from "@/pages/subscription/Subscription";
import Users from "@/pages/users/Users";

function Shell() {
  return (
    <AppShell>
      <Routes>
        {/* Open to every authenticated user (Owner + Cashier). */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/invoices" element={<InvoiceRegister />} />

        {/* Owner-only — guarded so manual URL entry by a cashier shows 403. */}
        <Route
          path="/products"
          element={<RequirePermission permission="product:manage"><Products /></RequirePermission>}
        />
        <Route
          path="/purchases"
          element={<RequirePermission permission="purchase:manage"><Purchases /></RequirePermission>}
        />
        <Route
          path="/inventory"
          element={<RequirePermission permission="inventory:view"><Inventory /></RequirePermission>}
        />
        <Route
          path="/reports"
          element={<RequirePermission permission="report:view"><Reports /></RequirePermission>}
        />
        <Route
          path="/users"
          element={<RequirePermission permission="user:manage"><Users /></RequirePermission>}
        />
        <Route
          path="/subscription"
          element={<RequirePermission permission="settings:manage"><Subscription /></RequirePermission>}
        />
        <Route
          path="/settings"
          element={<RequirePermission permission="settings:manage"><Settings /></RequirePermission>}
        />

        <Route path="/403" element={<Forbidden />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
