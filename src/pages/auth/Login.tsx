import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../../components/common/Logo";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("LOGIN BUTTON WORKED");

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Supabase login error:", error);
        throw error;
      }

      console.log("Login successful:", data);

      // Look up the user's role to decide where to send them
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Failed to fetch profile:", profileError);
        throw profileError;
      }

      if (profile?.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <Card>
        <Logo size="lg" />

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
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

          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/register")}
          >
            Create Account
          </Button>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <Link
            to="/forgot-password"
            className="block w-full text-center text-green-700 hover:underline text-sm"
          >
            Forgot Password?
          </Link>
        </form>
      </Card>
    </div>
  );
}