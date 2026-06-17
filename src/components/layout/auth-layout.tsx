type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function AuthLayout({ left, right }: Props) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      <div className="flex items-center justify-center p-8">{left}</div>

      <div className=" md:flex flex-col justify-between bg-radial from-bg-light to-bg-dark text-white p-10">
        {right}
      </div>
    </div>
  );
}
