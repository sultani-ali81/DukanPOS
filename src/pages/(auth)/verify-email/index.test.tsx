import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { verifyRegister } from "@/queries/auth";
import VerifyEmailPage from ".";

vi.mock("@/queries/auth", () => ({
  verifyRegister: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const mockedVerifyRegister = vi.mocked(verifyRegister);

function createToken(payload = {
  id: "employee-1",
  email: "user@example.com",
  role: "Admin",
}) {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

function renderPage(email?: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/verify-email",
          state: email ? { email } : null,
        },
      ]}
    >
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
        <Route path="/pos" element={<div>POS destination</div>} />
        <Route path="/register" element={<div>Registration page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function enterCode(code = "123456") {
  fireEvent.change(
    screen.getByLabelText("Six-digit email verification code"),
    { target: { value: code } },
  );
}

describe("registration email verification", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockedVerifyRegister.mockReset();
    sessionStorage.clear();
    useAuthStore.setState({ user: null, token: null });
  });

  it("verifies the OTP, authenticates the user, and redirects", async () => {
    const token = createToken();
    mockedVerifyRegister.mockResolvedValue({
      message: "Email verified successfully",
      token,
    });
    renderPage("user@example.com");

    expect(screen.getByText("user@example.com")).toBeTruthy();
    enterCode();
    await userEvent.click(
      screen.getByRole("button", { name: "Verify Email" }),
    );

    await screen.findByText("Dashboard destination");
    expect(mockedVerifyRegister).toHaveBeenCalledWith({
      email: "user@example.com",
      code: "123456",
    });
    expect(useAuthStore.getState().token).toBe(token);
    expect(useAuthStore.getState().user).toEqual({
      id: "employee-1",
      email: "user@example.com",
      role: "Admin",
    });
  });

  it.each(["Invalid OTP code", "OTP has expired"])(
    "shows the backend error: %s",
    async (message) => {
      mockedVerifyRegister.mockRejectedValue({ response: { data: { message } } });
      renderPage("user@example.com");
      enterCode();

      await userEvent.click(
        screen.getByRole("button", { name: "Verify Email" }),
      );

      expect((await screen.findByRole("alert")).textContent).toContain(message);
      expect(useAuthStore.getState().token).toBeNull();
    },
  );

  it("disables submission while verification is in progress", async () => {
    let resolveRequest: ((value: {
      message: string;
      token: string;
    }) => void) | undefined;
    mockedVerifyRegister.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderPage("user@example.com");
    enterCode();
    const submit = screen.getByRole("button", { name: "Verify Email" });

    await userEvent.click(submit);

    await waitFor(() => expect(mockedVerifyRegister).toHaveBeenCalledTimes(1));
    expect(
      (screen.getByRole("button", {
        name: "Verifying...",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Verifying..." }));
    expect(mockedVerifyRegister).toHaveBeenCalledTimes(1);

    resolveRequest?.({
      message: "Email verified successfully",
      token: createToken(),
    });
    await screen.findByText("Dashboard destination");
  });

  it("shows a registration recovery action when the email is missing", () => {
    renderPage();

    expect(screen.getByText("Email address missing")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Back to registration" })
        .getAttribute("href"),
    ).toBe("/register");
    expect(mockedVerifyRegister).not.toHaveBeenCalled();
  });
});
