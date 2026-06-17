import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

type NavbarProps = {
  userName?: string;
  avatarUrl?: string;
  onMenuClick?: () => void;
};

export default function Navbar({ onMenuClick }: NavbarProps) {
  const CurrentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="w-full bg-white">
      {/*Top row */}
      <div className="flex items-center justify-between px-4 py-3">
        {/*Logo + Name*/}
        <div className="flex items-center">
          <img src="/icons/logo.svg" alt="Logo" className="w-7 h-7" />
          <span className="-ml-1 text-lg font-semibold p-2">APOS</span>
        </div>

        {/*Right Side */}
        <div className="flex items-center gap-2">
          {/* Notification */}

          {/*Menu*/}
          <Button variant="outline" size="icon" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between px-4 pb-3 gap-2">
        {/*Date*/}
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2 text-sm text-gray-600 w-full">
          <span className="truncate">{CurrentDate}</span>
        </div>
      </div>
    </div>
  );
}
