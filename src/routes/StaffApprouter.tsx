
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import StaffProtectedRoute from "../pages/auth/StaffProtectedRoute";
import StaffLogin from "../pages/Staff/StaffLogin";
import StaffLayout from "../pages/Staff/Layout";
import StaffDashboard from "../pages/Staff/Dashboard";
import StaffAssignments from "../pages/Staff/Assignments";
import StaffAssignmentDetails from "../pages/Staff/AssignmentDetails";
import StaffHistory from "../pages/Staff/History";
import StaffProfile from "../pages/Staff/Profile";
import { StaffPreferencesProvider } from "../pages/Staff/StaffPreferencesContext";

export default function StaffAppRouter() {
  return (
    <StaffPreferencesProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<StaffLogin />} />

        <Route element={<StaffProtectedRoute />}>
          <Route element={<StaffLayout />}>
            <Route path="/dashboard" element={<StaffDashboard />} />
            <Route path="/assignments" element={<StaffAssignments />} />
            <Route
              path="/assignment/:id"
              element={<StaffAssignmentDetails />}
            />
            <Route path="/history" element={<StaffHistory />} />
            <Route path="/profile" element={<StaffProfile />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </StaffPreferencesProvider>
  );
}
