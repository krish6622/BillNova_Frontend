import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<Placeholder title="Billing POS" />} />
        <Route path="/products" element={<Placeholder title="Products" />} />
        <Route path="/purchases" element={<Placeholder title="Purchases" />} />
        <Route path="/inventory" element={<Placeholder title="Inventory" />} />
        <Route path="/reports" element={<Placeholder title="Reports" />} />
        <Route path="/settings" element={<Placeholder title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
