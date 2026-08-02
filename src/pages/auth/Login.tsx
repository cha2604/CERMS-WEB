import Logo from "../../components/common/Logo";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <Card>

        <Logo size="lg" />

        <div className="mt-8 space-y-5">

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
          />

          <Button>
            Login
          </Button>

          <Button variant="secondary">
            Create Account
          </Button>

          <button
            className="w-full text-center text-green-700 hover:underline text-sm"
          >
            Forgot Password?
          </button>

        </div>

      </Card>
    </div>
  );
}