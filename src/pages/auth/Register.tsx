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
  registerWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "../../lib/authHelpers";

export default function Register() {
  const navigate = useNavigate();

  const [method, setMethod] = useState<AuthMethod>("email");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  function switchMethod(next: AuthMethod) {
    setMethod(next);
    setErrorMessage("");
    setSuccessMessage("");
    setOtpSent(false);
    setOtpCode("");
    setEmailOtpSent(false);
    setEmailOtpCode("");
  }

  async function handleEmailRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await registerWithEmail(fullName, email, password);

      if (result.session) {
        navigate("/dashboard");
        return;
      }

      setEmailOtpSent(true);
      setSuccessMessage(`Code sent to ${email}. Enter it below.`);
    } catch (error) {
      console.error("Registration failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmailOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      await sendOtp(email, emailOtpCode);
      navigate("/dashboard");
    } catch (error) {
      console.error("Email OTP verification failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Invalid or expired code. Please try again."
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
      await sendPhoneOtp(phone, fullName);
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
      navigate("/dashboard");
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

        <p className="mt-4 text-center text-sm text-gray-500">
          Create an account to start reporting waste issues in the barangay.
        </p>

        <div className="mt-6">
          <AuthMethodTabs active={method} onChange={switchMethod} />
        </div>

        {method === "email" && !emailOtpSent && (
          <form onSubmit={handleEmailRegister} className="mt-6 space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Sending code..." : "Send Verification Code"}
            </Button>
          </form>
        )}

        {method === "email" && emailOtpSent && (
          <form onSubmit={handleVerifyEmailOtp} className="mt-6 space-y-5">
            <Input
              label="Verification Code"
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={emailOtpCode}
              onChange={(e) => setEmailOtpCode(e.target.value)}
              maxLength={6}
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Create Account"}
            </Button>

            <button
              type="button"
              onClick={() => setEmailOtpSent(false)}
              className="w-full text-center text-sm text-green-700 hover:underline"
            >
              Use a different email
            </button>
          </form>
        )}

        {method === "phone" && !otpSent && (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />

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
              {loading ? "Verifying..." : "Verify & Create Account"}
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

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-green-700 hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}

function sendOtp(_email: string, _sendOtp: string) {
  throw new Error("Function not implemented.");
}
