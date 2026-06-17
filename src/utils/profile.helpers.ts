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
  if (profile.firstName && profile.lastName)
    return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  if (profile.name) return profile.name.slice(0, 2).toUpperCase();
  return "??";
};

export const getDisplayName = (profile: EmployeeInfo): string => {
  if (profile.firstName) return `${profile.firstName}`;
  return display(profile.name);
};
