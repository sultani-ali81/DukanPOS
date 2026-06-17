import AuthLayout from "@/components/layout/auth-layout";
import Navbar from "@/components/layout/authNavbar";
import RegisterForm from "@/components/layout/register-form";
import StatsPanel from "@/components/layout/stats-panel";

export default function Register() {
  return (
    <>
      <div className="md:hidden">
        <Navbar userName="John Doe" onMenuClick={() => console.log("menu")} />
      </div>

      <AuthLayout left={<RegisterForm />} right={<StatsPanel />} />
    </>
  );
}
