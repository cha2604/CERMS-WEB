import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../../components/common/Logo";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthMethodTabs, {
  type AuthMethod,
} from "../../pages/auth/AuthMethodTabs";
import {
  loginWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  getCurrentUserRole,
} from "../../lib/authHelpers";

export default function Login() {
  const navigate = useNavigate();

  const [method, setMethod] = useState<AuthMethod>("email");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Email fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone fields
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  function switchMethod(next: AuthMethod) {
    setMethod(next);
    setErrorMessage("");
    setSuccessMessage("");
    setOtpSent(false);
    setOtpCode("");
  }

  async function redirectByRole() {
    const role = await getCurrentUserRole();
    if (role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/dashboard");
    }
  }

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("LOGIN BUTTON WORKED");
    setLoading(true);
    setErrorMessage("");

    try {
      await loginWithEmail(email, password);
      await redirectByRole();
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await sendPhoneOtp(phone);
      setOtpSent(true);
      setSuccessMessage(`Code sent to ${phone}. Enter it below.`);
    } catch (error) {
      console.error("Failed to send OTP:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Couldn't send verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      await verifyPhoneOtp(phone, otpCode);
      await redirectByRole();
    } catch (error) {
      console.error("OTP verification failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Invalid or expired code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <Card>
        <Logo size="lg" />

        <div className="mt-6">
          <AuthMethodTabs active={method} onChange={switchMethod} />
        </div>

        {/* EMAIL LOGIN */}
        {method === "email" && (
          <form onSubmit={handleEmailLogin} className="mt-6 space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        )}

        {/* PHONE LOGIN */}
        {method === "phone" && !otpSent && (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-5">
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="09XX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Sending code..." : "Send Verification Code"}
            </Button>
          </form>
        )}

        {method === "phone" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
            <Input
              label="Verification Code"
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              maxLength={6}
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Login"}
            </Button>

            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full text-center text-sm text-green-700 hover:underline"
            >
              Use a different number
            </button>
          </form>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/register")}
          className="mt-3"
        >
          Create Account
        </Button>

        {successMessage && (
          <div className="mt-5 rounded-xl bg-green-50 p-4 text-center text-sm text-green-800">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <Link
          to="/forgot-password"
          className="mt-5 block w-full text-center text-green-700 hover:underline text-sm"
        >
          Forgot Password?
        </Link>
      </Card>
    </div>
  );
}