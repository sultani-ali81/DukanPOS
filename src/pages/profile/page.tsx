"use client";

import OtpDialog from "@/components/otp-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditProfile } from "@/hooks/use-editprofile";
import { useProfile } from "@/hooks/use-profile";
import { verifyUpdatedEmail } from "@/queries/employee";
import {
  display,
  formatDate,
  getDisplayName,
  getInitials,
} from "@/utils/profile.helpers";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EditProfileDialog } from "./edit-profile-dialog";
import { TwoFactorCard } from "./two-factor-card";

export default function ProfileClient() {
  const navigate = useNavigate();
  const { profile, isLoading, fetchError, mutate } = useProfile();
  const {
    editOpen,
    openEdit,
    closeEdit,
    otpOpen,
    closeOtp,
    pendingEmail,
    handleEmailChange,
  } = useEditProfile(profile);

  async function handleVerifyOtp(code: string) {
    await verifyUpdatedEmail({ email: pendingEmail, code });
    await mutate();
    toast.success("Email updated", {
      description: "Your email has been verified and updated.",
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div>
        <PageHeader
          title="Profile Settings"
          description="Manage your account information."
        >
          <Button type="button" variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="size-4" /> Back
          </Button>
        </PageHeader>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load profile.
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Profile Settings"
        description="Manage your account information."
      >
        <Button type="button" variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Left: Personal information ── */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Personal Information</CardTitle>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={openEdit}
            >
              <Pencil className="size-4" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border bg-muted text-lg font-semibold text-muted-foreground">
                {profile.imageUrl ? (
                  <img
                    src={profile.imageUrl}
                    alt={getDisplayName(profile)}
                    className="size-full object-cover"
                  />
                ) : (
                  getInitials(profile)
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {getDisplayName(profile)}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {display(profile.role)}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">Email</p>
                <div className="break-words rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {display(profile.email)}
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">Phone</p>
                <div className="break-words rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {display(profile.phone)}
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <div className="break-words rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {formatDate(profile.dob)}
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">Gender</p>
                <div className="break-words rounded-lg border bg-muted/30 px-3 py-2 text-sm capitalize">
                  {display(profile.gender)}
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">Store Name</p>
                <div className="break-words rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {display(profile.storeName)}
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">Member Since</p>
                <div className="break-words rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {formatDate(profile.createdAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Right: 2FA — no props needed, reads from auth store ── */}
        <TwoFactorCard />
      </div>

      {editOpen && (
        <EditProfileDialog
          open
          profile={profile}
          onOpenChange={(open) => (open ? openEdit() : closeEdit())}
          onSaved={() => mutate()}
          onEmailChange={handleEmailChange}
        />
      )}

      <OtpDialog
        open={otpOpen}
        onClose={closeOtp}
        title="Verify Email"
        description={`We sent a verification code to ${pendingEmail}`}
        onVerify={handleVerifyOtp}
      />
    </div>
  );
}
