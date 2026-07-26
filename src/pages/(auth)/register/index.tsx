import Navbar from "@/components/layout/authNavbar";
import RegisterForm from "@/components/layout/register-form";

export default function Register() {
  return (
    <div className="auth-light">
      <div className="md:hidden">
        <Navbar />
      </div>
      <RegisterForm />
    </div>
  );
}
