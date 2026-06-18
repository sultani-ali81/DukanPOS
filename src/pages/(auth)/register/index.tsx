import Navbar from "@/components/layout/authNavbar";
import RegisterForm from "@/components/layout/register-form";

export default function Register() {
  return (
    <>
      <div className="md:hidden">
        <Navbar userName="John Doe" onMenuClick={() => console.log("menu")} />
      </div>
      <RegisterForm />
    </>
  );
}
