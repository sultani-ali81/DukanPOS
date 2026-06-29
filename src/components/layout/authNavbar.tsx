export default function Navbar() {
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
        {/*Right Side */}
        <div className="flex items-center gap-2">{/* Notification */}</div>
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
