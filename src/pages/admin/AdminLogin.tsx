import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import PasswordInput from "../../components/common/Password";
import Button from "../../components/common/Button";
import { FiLock, FiMail } from "react-icons/fi";
import {
  loginWithEmail,
  getAccountStatus,
} from "../../lib/authHelpers";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleAdminLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      await loginWithEmail(email, password);

      const status = await getAccountStatus();

      if (status.role !== "admin") {
        await supabase.auth.signOut();

        setErrorMessage(
          "Invalid administrator account."
        );

        return;
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Admin login failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-5">
      <Card>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          <FiLock size={22} />
        </div>

        <h1 className="mt-4 text-center text-lg font-bold text-green-800">
          CERMS
        </h1>

        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800">
            Admin Login
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Administrator access
          </p>
        </div>

        <form
          onSubmit={handleAdminLogin}
          className="mt-6 space-y-5"
        >
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            icon={<FiMail size={16} />}
            value={email}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>
            ) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>
            ) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}