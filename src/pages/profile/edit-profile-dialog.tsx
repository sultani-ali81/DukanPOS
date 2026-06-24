import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneNumberInput } from "@/components/ui/phoneinput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  removeEmployeeImage,
  updateEmployeeInfo,
  uploadEmployeeImage,
} from "@/queries/employee";
import type { EditProfile, EmployeeInfo } from "@/types";
import { getDisplayName, getInitials } from "@/utils/profile.helpers";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Value as PhoneValue } from "react-phone-number-input";
import { toast } from "sonner";
import { z } from "zod";

const profileFormSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: z.string().min(1, "Phone is required"),
    gender: z.union([
      z.literal("male"),
      z.literal("female"),
      z.literal("other"),
      z.literal(""),
    ]),
    dob: z.string().optional(),
    storeName: z.string().min(1, "Store name is required"),
    oldPassword: z.string().optional(),
    password: z.string().optional(),
  })
  .refine((data) => !data.password || data.password.length >= 8, {
    message: "Password must be at least 8 characters",
    path: ["password"],
  })
  .refine((data) => !data.password || !!data.oldPassword, {
    message: "Current password is required to set a new password",
    path: ["oldPassword"],
  });

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditProfileDialogProps {
  open: boolean;
  profile: EmployeeInfo;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onEmailChange: (email: string) => void;
}

export function EditProfileDialog({
  open,
  profile,
  onOpenChange,
  onSaved,
  onEmailChange,
}: EditProfileDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "",
      dob: "",
      storeName: "",
      oldPassword: "",
      password: "",
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // pendingAttachmentId: the id returned by the upload endpoint for a newly
  // selected photo that hasn't been claimed yet (claim happens on save).
  const [pendingAttachmentId, setPendingAttachmentId] = useState<string | null>(
    null,
  );

  // avatarPreview: object URL for the locally selected file, shown immediately
  // before the save completes. Stored in a ref as well for safe revocation.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarPreviewRef = useRef<string | null>(null);

  function updateAvatarPreview(url: string | null) {
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    avatarPreviewRef.current = url;
    setAvatarPreview(url);
  }

  // Reset form + pending avatar state every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    reset({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      gender: (profile.gender as ProfileFormValues["gender"]) ?? "",
      dob: profile.dob ? profile.dob.split("T")[0] : "",
      storeName: profile.storeName ?? "",
      oldPassword: "",
      password: "",
    });
    updateAvatarPreview(null);
    setPendingAttachmentId(null);
  }, [open, profile, reset]);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Show local preview immediately.
    updateAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file); // field name ImageUploadInterceptor expects
      formData.append("entityType", "employee");
      const { id } = await uploadEmployeeImage(formData);
      setPendingAttachmentId(id);
      toast.success("Photo ready", {
        description: "Save your changes to apply it.",
      });
    } catch {
      // Upload failed — discard the preview so we don't show a broken state.
      updateAvatarPreview(null);
      setPendingAttachmentId(null);
      toast.error("Could not upload photo", {
        description: "Please try again.",
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  function cancelPendingAvatar() {
    // Pending attachment becomes an orphan on the backend — flagged earlier as
    // a known gap without a dedicated delete-unclaimed endpoint.
    updateAvatarPreview(null);
    setPendingAttachmentId(null);
  }

  async function handleAvatarRemove() {
    // If there's a pending (unsaved) upload, just cancel it locally.
    if (pendingAttachmentId) {
      cancelPendingAvatar();
      return;
    }
    // Otherwise delete the existing profile photo immediately.
    try {
      await removeEmployeeImage();
      onSaved(); // mutate so the card refreshes
      toast.success("Profile photo removed");
    } catch {
      toast.error("Could not remove photo", {
        description: "Please try again.",
      });
    }
  }

  async function submit(values: ProfileFormValues) {
    const payload: Partial<EditProfile> = {};

    // Include dirty form fields (excluding password pair, handled separately).
    (Object.keys(dirtyFields) as (keyof typeof dirtyFields)[]).forEach(
      (key) => {
        if (key === "oldPassword" || key === "password") return;
        if (dirtyFields[key]) {
          (payload as Record<string, unknown>)[key] = values[key];
        }
      },
    );

    // Password change is always sent as a pair.
    if (dirtyFields.password) {
      payload.password = values.password;
      payload.oldPassword = values.oldPassword;
    }

    // Pending photo attachment — always include if present, regardless of
    // dirty fields (it's managed outside RHF).
    if (pendingAttachmentId) {
      payload.attachmentId = pendingAttachmentId;
    }

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    const emailChanged = !!dirtyFields.email;

    try {
      await updateEmployeeInfo(payload);
      onOpenChange(false);

      if (emailChanged) {
        onEmailChange(values.email);
      } else {
        toast.success("Profile updated", {
          description: "Your profile information has been saved.",
        });
        onSaved();
      }
    } catch {
      toast.error("Could not update profile", {
        description: "Please try again.",
      });
    }
  }

  // What to display in the avatar — pending preview takes priority over the
  // saved profile image.
  const displayImage = avatarPreview ?? profile.imageUrl ?? null;
  const hasPendingAvatar = !!avatarPreview;
  const hasAnyAvatar = !!displayImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-xl"
        onPointerDownOutside={(e) => {
          if (
            (e.target as HTMLElement | null)?.closest(
              '[data-slot="select-content"]',
            )
          ) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          if (
            (e.target as HTMLElement | null)?.closest(
              '[data-slot="select-content"]',
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit(submit)}>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your personal information. Changing your email requires
                verification.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* ── Avatar ───────────────────────────────────────────── */}
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="group relative shrink-0">
                  <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border bg-muted text-lg font-semibold text-muted-foreground">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={getDisplayName(profile)}
                        className="size-full object-cover"
                      />
                    ) : (
                      getInitials(profile)
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Change photo"
                  >
                    {avatarUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium">Profile Photo</p>
                  {hasPendingAvatar ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        New photo selected — save to apply
                      </span>
                      <button
                        type="button"
                        onClick={cancelPendingAvatar}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" /> Cancel
                      </button>
                    </div>
                  ) : hasAnyAvatar ? (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" /> Remove photo
                    </button>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Click the avatar to upload a photo.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Name ─────────────────────────────────────────────── */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="ep-firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="ep-firstName" {...register("firstName")} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ep-lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="ep-lastName" {...register("lastName")} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Email ────────────────────────────────────────────── */}
              <div className="grid gap-2">
                <Label htmlFor="ep-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input id="ep-email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Changing your email will require a verification code.
                </p>
              </div>

              {/* ── Phone + DOB ───────────────────────────────────────── */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneNumberInput
                        label="Phone *"
                        value={field.value as PhoneValue}
                        placeholder="700 000 000"
                        onChange={field.onChange}
                        error={!!errors.phone}
                      />
                    )}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ep-dob">Date of Birth</Label>
                  <Input id="ep-dob" type="date" {...register("dob")} />
                </div>
              </div>

              {/* ── Gender + Store ────────────────────────────────────── */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="ep-gender">Gender</Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="ep-gender" className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ep-storeName">
                    Store Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="ep-storeName" {...register("storeName")} />
                  {errors.storeName && (
                    <p className="text-xs text-destructive">
                      {errors.storeName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Role (read-only) ──────────────────────────────────── */}
              <div className="grid gap-2">
                <Label>Role</Label>
                <Input
                  value={profile.role ?? "—"}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>

              {/* ── Password change ───────────────────────────────────── */}
              <div className="space-y-4 rounded-lg border p-4">
                <p className="text-sm font-medium">Change Password</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="ep-oldPassword">Current Password</Label>
                    <Input
                      id="ep-oldPassword"
                      type="password"
                      {...register("oldPassword")}
                    />
                    {errors.oldPassword && (
                      <p className="text-xs text-destructive">
                        {errors.oldPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ep-password">New Password</Label>
                    <Input
                      id="ep-password"
                      type="password"
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep your current password.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || avatarUploading}>
                {(isSubmitting || avatarUploading) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
