import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import ResidentDashboard from "./pages/resident/Dashboard";
import SubmitReport from "./pages/resident/ReportIssue";
import MyReport from "./pages/resident/MyReport";
import ReportDetails from "./pages/resident/ReportDetails";
import MapView from "./pages/resident/Mapview";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminReports from "./pages/admin/Reports";
import AdminReportDetails from "./pages/admin/ReportDetails";
import AdminMap from "./pages/admin/Map";
import Users from "./pages/admin/Users";

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
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/map" element={<AdminMap />} />
      <Route path="/admin/users" element={<Users />} />

      <Route
        path="/admin/report/:id"
        element={<AdminReportDetails />}
      />

      <Route
        path="/admin/reports/:id"
        element={<AdminReportDetails />}
      />

      <Route
        path="/admin/reports-overview"
        element={<Navigate to="/admin/reports" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}