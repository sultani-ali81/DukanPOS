function getTodayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface StatsOptions {
  total: number;
  currentCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  isLoading: boolean;
}

export function buildCustomerStats({
  total,
  currentCount,
  page,
  totalPages,
  pageSize,
  isLoading,
}: StatsOptions) {
  const today = getTodayLabel();
  const dash = "—";

  return [
    {
      label: "Total Customers",
      value: isLoading ? dash : String(total),
      date: today,
      sub: "All contacts",
    },
    {
      label: "Current Page",
      value: isLoading ? dash : String(currentCount),
      date: today,
      sub: `Page ${page} of ${totalPages}`,
    },
    {
      label: "Total Pages",
      value: isLoading ? dash : String(totalPages),
      date: today,
      sub: `${pageSize} per page`,
    },
  ];
}
