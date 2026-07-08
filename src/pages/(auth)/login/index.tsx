import Navbar from "@/components/layout/authNavbar";
import LoginForm from "@/components/layout/login-form";

export default function Login() {
  return (
    <>
      <div className="md:hidden">
        <Navbar />
      </div>

      <LoginForm />
    </>
  );
}
