import { useState, type SetStateAction } from "react";
import { useNavigate, Link } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import PasswordInput from "../../components/common/Password";
import Button from "../../components/common/Button";
import { FiArrowLeft, FiUser, FiPhone } from "react-icons/fi";
import {
  loginWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  getCurrentUserRole,
} from "../../lib/authHelpers";

export default function Login() {
  const navigate = useNavigate();

  const [showPhoneFlow, setShowPhoneFlow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

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

  async function handleGoogleLogin() {
    setErrorMessage("");
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Google login failed."
      );
    }
  }

  function openPhoneFlow() {
    setShowPhoneFlow(true);
    setErrorMessage("");
    setSuccessMessage("");
    setOtpSent(false);
    setOtpCode("");
  }

  function backToEmail() {
    setShowPhoneFlow(false);
    setErrorMessage("");
    setSuccessMessage("");
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
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            aria-label="Go back"
            className="rounded-full p-2 text-green-700 transition hover:bg-green-50"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-green-800">CERMS</h1>
          <span className="w-9" />
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Welcome Back!</h2>
          <p className="mt-1 text-sm text-gray-500">Login to your account</p>
        </div>

        {!showPhoneFlow && (
          <form onSubmit={handleEmailLogin} className="mt-6 space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              icon={<FiUser size={16} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e: { target: { value: SetStateAction<string>; }; }) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-green-700 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-green-700 hover:underline">
                Register here
              </Link>
            </p>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-gray-400">OR</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C41.5 36.5 44 30.7 44 24c0-1.3-.1-2.5-.4-3.5z"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={openPhoneFlow}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiPhone size={16} />
              Login with Phone Number
            </button>
          </form>
        )}

        {showPhoneFlow && !otpSent && (
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

            <button
              type="button"
              onClick={backToEmail}
              className="w-full text-center text-sm text-green-700 hover:underline"
            >
              Back to Email Login
            </button>
          </form>
        )}

        {showPhoneFlow && otpSent && (
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
      </Card>
    </div>
  );
}

function loginWithGoogle() {
  throw new Error("Function not implemented.");
}
