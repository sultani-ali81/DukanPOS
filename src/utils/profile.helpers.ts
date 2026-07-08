import type { EmployeeInfo } from "@/types/";
import { format } from "date-fns";

export const display = (val: string | null | undefined): string =>
  val && val.trim() !== "" ? val : "...";

export const formatDate = (val: string | null | undefined): string => {
  if (!val) return "...";
  try {
    return format(new Date(val), "dd, MMM, yyyy");
  } catch {
    return "...";
  }
};

export const getInitials = (profile: EmployeeInfo): string => {
  const firstName = profile.firstName?.trim();
  const lastName = profile.lastName?.trim();

  if (firstName && lastName)
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (lastName) return lastName.slice(0, 2).toUpperCase();
  if (profile.email) return profile.email.slice(0, 2).toUpperCase();
  return "??";
};

export const getDisplayName = (profile: EmployeeInfo): string => {
  const fullName = [profile.firstName, profile.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return display(fullName || profile.email);
};
