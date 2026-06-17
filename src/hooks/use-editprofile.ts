import { useState } from "react";
import type { EmployeeInfo, EditProfile } from "@/types/index";

const defaultForm: EditProfile = {
  firstName: "",
  lastName: "",
  role: "",
  email: "",
  phone: "",
  gender: "",
  dob: "",
  storeName: "",
  imageUrl: "",
};

// Converts profile data into edit form format
const profileToForm = (profile: EmployeeInfo): EditProfile => ({
  firstName: profile.firstName ?? "",
  lastName: profile.lastName ?? "",
  role: profile.role ?? "",
  email: profile.email ?? "",
  phone: profile.phone ?? "",
  gender: profile.gender ?? "",
  dob: profile.dob ? profile.dob.split("T")[0] : "",
  storeName: profile.storeName ?? "",
  imageUrl: profile.imageUrl ?? "",
});

export function useEditProfile(profile: EmployeeInfo | undefined) {
  const [editOpen, setEditOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [EditProfile, setEditProfile] = useState<EditProfile>(defaultForm);

  const openEdit = () => {
    if (!profile) return;
    setEditProfile(profileToForm(profile)); // ← single call instead of 9 lines
    setEditOpen(true);
  };

  const closeEdit = () => setEditOpen(false);

  const handleEmailChange = (email: string) => {
    setPendingEmail(email);
    setEditOpen(false);
    setOtpOpen(true);
  };

  const closeOtp = () => {
    setOtpOpen(false);
    setPendingEmail("");
  };

  return {
    editOpen,
    closeEdit,
    openEdit,
    otpOpen,
    closeOtp,
    pendingEmail,
    EditProfile,
    setEditProfile,
    handleEmailChange,
  };
}
