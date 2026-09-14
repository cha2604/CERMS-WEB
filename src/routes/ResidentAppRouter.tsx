import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/resident/Login";
import Register from "../pages/auth/Register";
import ApprovalPending from "../pages/resident/ApprovalPending";
import ApprovalRejected from "../pages/resident/ApprovalRejected";

import ResidentLayout from "../pages/resident/Layout";
import ResidentDashboard from "../pages/resident/Dashboard";
import SubmitReport from "../pages/resident/ReportIssue";
import MyReport from "../pages/resident/MyReport";
import DraftReport from "../pages/resident/DraftReport";
import History from "../pages/resident/History";
import Profile from "../pages/resident/Profile";
import ReportDetails from "../pages/resident/ReportDetails";
import MapView from "../pages/resident/Mapview";

import ProtectedRoute from "./ProtectedRoute";

export default function UserAppRouter() {
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
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/approval-pending"
        element={<ApprovalPending />}
      />

      <Route
        path="/approval-rejected"
        element={<ApprovalRejected />}
      />

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <ResidentLayout />
          }
        >
          <Route
            path="/dashboard"
            element={
              <ResidentDashboard />
            }
          />

          <Route
            path="/report"
            element={
              <SubmitReport />
            }
          />

          <Route
            path="/report/new"
            element={
              <SubmitReport />
            }
          />

          <Route
            path="/my-reports"
            element={
              <MyReport />
            }
          />

          <Route
            path="/reports"
            element={
              <MyReport />
            }
          />

          <Route
            path="/drafts"
            element={
              <DraftReport />
            }
          />

          <Route
            path="/history"
            element={
              <History />
            }
          />

          <Route
            path="/profile"
            element={
              <Profile />
            }
          />

          <Route
            path="/report/:id"
            element={
              <ReportDetails />
            }
          />

          <Route
            path="/map"
            element={
              <MapView />
            }
          />
        </Route>
      </Route>

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