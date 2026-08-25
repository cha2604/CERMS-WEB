import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResidentDashboard from "./pages/resident/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import ManagerDashboard from "./pages/Manager/Dashboard";
import ManagerReports from "./pages/Manager/Reports";
import SubmitReport from "./pages/resident/ReportIssue";
import MyReport from "./pages/resident/MyReport";
import AdminReportDetails from "./pages/admin/ReportDetails";
import Profile from "./pages/resident/Profile";
import DraftReports from "./pages/resident/DraftReport";
import ReportDetails from "./pages/resident/ReportDetails";

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Resident Routes */}
      <Route path="/dashboard" element={<ResidentDashboard />} />
      <Route path="/report/new" element={<SubmitReport />} />
      <Route path="/reports" element={<MyReport />} />
      <Route path="/reports/drafts" element={<DraftReports />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/report/:id" element={<ReportDetails />} />
      <Route path="/reports/:id" element={<ReportDetails />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/reports/:id" element={<AdminReportDetails />} />

      {/* Manager Routes */}
      <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      <Route path="/manager/reports" element={<ManagerReports />} />
      {/* ADDED: Route for Manager viewing report details */}
      <Route path="/manager/reports/:id" element={<AdminReportDetails />} /> 

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;