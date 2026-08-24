import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResidentDashboard from "./pages/resident/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import SubmitReport from "./pages/resident/ReportIssue";
import MyReport from "./pages/resident/MyReport";
import AdminReports from "./pages/admin/Reports";
import AdminReportDetails from "./pages/admin/ReportDetails";
import Profile from "./pages/resident/Profile";
import DraftReports from "./pages/resident/DraftReport";
import ReportDetails from "./pages/resident/ReportDetails";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ResidentDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/report/new" element={<SubmitReport />} />
      <Route path="/reports" element={<MyReport />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/reports/:id" element={<AdminReportDetails />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/reports/drafts" element={<DraftReports />} />
      <Route path="/report/:id" element={<ReportDetails />} />
      <Route path="/reports/:id" element={<ReportDetails />} />
    </Routes>
  );
}

export default App;