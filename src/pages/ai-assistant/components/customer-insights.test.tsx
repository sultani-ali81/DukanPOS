import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  CustomerInsights,
  type CustomerInsight,
} from "./customer-insights";

const customer: CustomerInsight = {
  id: "customer-1",
  name: "Amina Rahimi",
  phone: "+93700123456",
  address: "Kabul, Afghanistan",
  saleCount: 7,
  salesTotal: 15000,
  paidSales: 12000,
  salesBalance: 3000,
  purchaseCount: 2,
  purchaseTotal: 9000,
  paidPurchases: 8000,
  purchaseBalance: 1000,
  profit: 3200,
  createdAt: "2026-07-19T10:00:00.000Z",
};

describe("CustomerInsights", () => {
  afterEach(cleanup);

  it("renders a detailed customer result with AFN monetary values", () => {
    render(<CustomerInsights customers={[customer]} />);

    expect(screen.getByText("Customer insight")).toBeTruthy();
    expect(screen.getByText("Amina Rahimi")).toBeTruthy();
    expect(screen.getByText("+93700123456")).toBeTruthy();
    expect(screen.getByText("Kabul, Afghanistan")).toBeTruthy();
    expect(screen.getByText("Sales count")).toBeTruthy();
    expect(screen.getByText("Purchase count")).toBeTruthy();
    expect(screen.getByText("AFN 15,000")).toBeTruthy();
    expect(screen.getByText("AFN 3,200")).toBeTruthy();
    expect(
      screen.getByText("Sales balance (customer owes the store)"),
    ).toBeTruthy();
    expect(
      screen.getByText("Purchase balance (store owes the supplier/customer)"),
    ).toBeTruthy();
  });

  it("renders a customer list and retains zero monetary values", () => {
    render(
      <CustomerInsights
        customers={[
          { ...customer, profit: undefined },
          {
            ...customer,
            id: "customer-2",
            name: "Farid Safi",
            profit: undefined,
            saleCount: 0,
            salesTotal: 0,
            paidSales: 0,
            salesBalance: 0,
            purchaseCount: 0,
            purchaseTotal: 0,
            paidPurchases: 0,
            purchaseBalance: 0,
          },
        ]}
      />,
    );

    expect(screen.getByText("Customer insights")).toBeTruthy();
    expect(screen.getAllByTestId("customer-insight-card")).toHaveLength(2);
    expect(screen.getByText("Farid Safi")).toBeTruthy();
    expect(screen.getAllByText("AFN 0").length).toBeGreaterThan(0);
    expect(screen.queryByText("Profit")).toBeNull();
  });

  it("does not render a customer section when no customer result is supplied", () => {
    const { container } = render(<CustomerInsights customers={[]} />);

    expect(container.innerHTML).toBe("");
  });
});
