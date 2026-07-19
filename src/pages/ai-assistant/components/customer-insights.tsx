import { formatCurrency } from "@/lib/currency";
import type { AiAssistantCustomerInsight } from "@/types/ai-assistant";
import { CalendarDays, MapPin, Phone, UserRound } from "lucide-react";

/**
 * A customer result supplied by the AI customer tool. `profit` is optional
 * because it is only included for questions that ask for profit explicitly.
 */
export type CustomerInsight = AiAssistantCustomerInsight;

type CustomerInsightsProps = {
  customers?: CustomerInsight[];
};

type CustomerMetricProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

function formatAmount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? formatCurrency(value)
    : "—";
}

function formatCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
        value,
      )
    : "—";
}

function formatCustomerDate(value: string | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CustomerMetric({ label, value, emphasis = false }: CustomerMetricProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasis
            ? "text-right text-sm font-semibold text-foreground"
            : "text-right text-sm font-medium text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function CustomerInsightCard({ customer }: { customer: CustomerInsight }) {
  const hasProfit =
    typeof customer.profit === "number" && Number.isFinite(customer.profit);

  return (
    <article
      data-testid="customer-insight-card"
      className="rounded-md border border-border bg-background/80 p-3"
    >
      <header className="flex flex-col gap-1.5 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-foreground">
            {customer.name || "Unnamed customer"}
          </h4>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {customer.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" aria-hidden="true" />
                {customer.phone}
              </span>
            ) : null}
            {customer.address ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {customer.address}
              </span>
            ) : null}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3" aria-hidden="true" />
          Customer since {formatCustomerDate(customer.createdAt)}
        </span>
      </header>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <section aria-label="Customer sales summary">
          <h5 className="mb-1.5 text-xs font-semibold tracking-wide text-foreground uppercase">
            Sales
          </h5>
          <dl className="space-y-1.5">
            <CustomerMetric
              label="Sales count"
              value={formatCount(customer.saleCount)}
            />
            <CustomerMetric
              label="Sales total"
              value={formatAmount(customer.salesTotal)}
            />
            <CustomerMetric
              label="Paid sales"
              value={formatAmount(customer.paidSales)}
            />
            <CustomerMetric
              label="Sales balance (customer owes the store)"
              value={formatAmount(customer.salesBalance)}
              emphasis
            />
          </dl>
        </section>

        <section aria-label="Customer purchase summary">
          <h5 className="mb-1.5 text-xs font-semibold tracking-wide text-foreground uppercase">
            Purchases
          </h5>
          <dl className="space-y-1.5">
            <CustomerMetric
              label="Purchase count"
              value={formatCount(customer.purchaseCount)}
            />
            <CustomerMetric
              label="Purchase total"
              value={formatAmount(customer.purchaseTotal)}
            />
            <CustomerMetric
              label="Paid purchases"
              value={formatAmount(customer.paidPurchases)}
            />
            <CustomerMetric
              label="Purchase balance (store owes the supplier/customer)"
              value={formatAmount(customer.purchaseBalance)}
              emphasis
            />
          </dl>
        </section>
      </div>

      {hasProfit ? (
        <dl className="mt-3 border-t border-border pt-3">
          <CustomerMetric
            label="Profit"
            value={formatAmount(customer.profit)}
            emphasis
          />
        </dl>
      ) : null}
    </article>
  );
}

/**
 * Renders both a single customer lookup and customer lists/search results in a
 * compact, consistently formatted form inside an assistant message.
 */
export function CustomerInsights({ customers }: CustomerInsightsProps) {
  if (!customers?.length) return null;

  const isSingleCustomer = customers.length === 1;

  return (
    <section
      aria-label={isSingleCustomer ? "Customer insight" : "Customer insights"}
      data-testid="customer-insights"
      className="mt-3 space-y-2"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <UserRound className="size-3.5" aria-hidden="true" />
        {isSingleCustomer ? "Customer insight" : "Customer insights"}
      </div>
      <div className="space-y-2">
        {customers.map((customer) => (
          <CustomerInsightCard key={customer.id} customer={customer} />
        ))}
      </div>
    </section>
  );
}
