import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResidentDashboard from "./pages/resident/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ResidentDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      {/* Redirect the root path to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch-all for unknown routes */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;