import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Inventory from "@/pages/inventory/Inventory";
import Placeholder from "@/pages/Placeholder";
import POS from "@/pages/pos/POS";
import Products from "@/pages/products/Products";
import Purchases from "@/pages/purchases/Purchases";
import Subscription from "@/pages/subscription/Subscription";

function Shell() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/products" element={<Products />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Placeholder title="Reports" />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/settings" element={<Placeholder title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
