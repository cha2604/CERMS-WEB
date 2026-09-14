import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminReports from "../pages/admin/Reports";
import AdminMap from "../pages/admin/Map";
import AdminReportDetails from "../pages/admin/ReportDetails";
import Users from "../pages/admin/Users";
import Approval from "../pages/admin/Approval";
import Archive from "../pages/admin/Archive";

export default function AdminAppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<AdminLogin />}
      />

      <Route
        path="/dashboard"
        element={<AdminDashboard />}
      />

      <Route
        path="/reports"
        element={<AdminReports />}
      />

      <Route
        path="/map"
        element={<AdminMap />}
      />

      <Route
        path="/users"
        element={<Users />}
      />

      <Route
        path="/approval"
        element={<Approval />}
      />

      <Route
        path="/archive"
        element={<Archive />}
      />

      <Route
        path="/report/:id"
        element={<AdminReportDetails />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}