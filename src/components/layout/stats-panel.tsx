import { Card, CardContent } from "@/components/ui/card";
import { BadgeDollarSign, Briefcase, Package, PackageOpen } from "lucide-react";
const stats = [
  { title: "Order Process", value: "5", badge: "0.5%", icon: PackageOpen },
  { title: "Order Done", value: "40", badge: "", icon: Package },
  { title: "Total Order", value: "120", badge: "", icon: Briefcase },
  {
    title: "Total Income",
    value: "1,200.00",
    badge: "0.5%",
    icon: BadgeDollarSign,
  },
];

const CurrentDate = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function StatsPanel() {
  return (
    <>
      <div className="flex items-center justify-center mb-2 gap-2 text-center">
        <img src="/icons/logo.svg" alt="Logo" className="w-9 h-9 gap-2" />
        <div className="text-xl font-bold mr-4">APOS</div>
      </div>

      <div className="grid grid-cols-2 sm-grid-cols gap-4 mb-12 mr-10 ml-10 mt-10">
        {stats.map((item, i) => (
          <Card key={i} className="bg-white/4 border-white/10 rounded-2xl">
            <CardContent className="p-4 space-y-10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <item.icon className="w-6 h-6 text-gray-300" />
                  <p className="text-lg text-gray-100">{item.title}</p>
                </div>
                {item.badge && (
                  <span className="text-xs text-green-400 font-medium ">
                    {item.badge}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">
                {item.value}
              </h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-gray-600" />
              </div>
              {/*Date*/}
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 -mb-3">
                <span className="truncate">{CurrentDate}</span>
              </div>{" "}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">
          Track your business growth with <br />
          intuitive analytics.
        </h2>
        <p className="text-gray-400 text-sm">
          Access your dashboard and stay updated with real-time insights
        </p>
      </div>
      {/* <div className="flex justify-center gap-2 -mt-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-white"></div>
        <div className="w-2 h-2 rounded-full bg-white"></div>
        <div className="w-2 h-2 rounded-full bg-white"></div>
        <div className="w-2 h-2 rounded-full bg-white"></div>
      </div> */}
    </>
  );
}
