const PENDING_REGISTRATION_EMAIL_KEY = "pending-registration-email";

export function getPendingRegistrationEmail(): string {
  try {
    return sessionStorage.getItem(PENDING_REGISTRATION_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPendingRegistrationEmail(email: string): void {
  try {
    sessionStorage.setItem(PENDING_REGISTRATION_EMAIL_KEY, email);
  } catch {
    // Route state still carries the email when session storage is unavailable.
  }
}

export function clearPendingRegistrationEmail(): void {
  try {
    sessionStorage.removeItem(PENDING_REGISTRATION_EMAIL_KEY);
  } catch {
    // Nothing to clear when session storage is unavailable.
  }
}
