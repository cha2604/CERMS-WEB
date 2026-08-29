import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResidentDashboard from "./pages/resident/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import ReportDetails from "./pages/resident/ReportDetails";
import AdminReportDetails from "./pages/admin/ReportDetails";
import SubmitReport from "./pages/resident/ReportIssue";
import MyReport from "./pages/resident/MyReport";
import MapView from "./pages/resident/Mapview";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<ResidentDashboard />} />
      <Route path="/report/new" element={<SubmitReport />} />
      <Route path="/reports" element={<MyReport />} />
      <Route path="/report/:id" element={<ReportDetails />} />
      <Route path="/map" element={<MapView />} />

      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/report/:id" element={<AdminReportDetails />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}