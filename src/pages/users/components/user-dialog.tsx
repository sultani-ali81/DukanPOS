// src/pages/users/components/user-dialog.tsx
import {
  CompactDialogBody,
  CompactDialogContent,
  CompactDialogFooter,
  CompactDialogHeader,
} from "@/components/compact-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
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
import { passwordSchema } from "@/lib/password";
import type { CreateUserPayload, UpdateUserPayload, User } from "@/types/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Value as PhoneValue } from "react-phone-number-input";
import { z } from "zod";

// ─── Schemas ────────────────────────────────────────────────────────────────

const editUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().optional(),
});

const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: passwordSchema,
  phone: z.string().optional(),
  role: z.enum(["Cashier", "Admin"]),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserFormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: "Cashier" | "Admin";
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface UserDialogProps {
  open: boolean;
  editingUser: User | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    payload: CreateUserPayload | UpdateUserPayload,
    id?: string,
  ) => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UserDialog({
  open,
  editingUser,
  onOpenChange,
  onSubmit,
}: UserDialogProps) {
  const isEdit = !!editingUser;

  const resolver = useMemo(
    () => zodResolver(isEdit ? editUserSchema : createUserSchema),
    [isEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      role: "Cashier",
    },
  });

  useEffect(() => {
    reset({
      firstName: editingUser?.firstName ?? "",
      lastName: editingUser?.lastName ?? "",
      email: editingUser?.email ?? "",
      password: "",
      phone: editingUser?.phone ?? "",
      role: editingUser?.role ?? "Cashier",
    });
  }, [editingUser, open, reset]);

  async function submit(values: UserFormValues) {
    const payload = isEdit
      ? ({
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
        } as UpdateUserPayload)
      : ({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          phone: values.phone,
          role: values.role,
        } as CreateUserPayload);

    await onSubmit(payload, editingUser?.id);
    onOpenChange(false);
    reset({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      role: "Cashier",
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <CompactDialogContent>
        <form onSubmit={handleSubmit(submit)}>
          <CompactDialogHeader>
            <DialogTitle className="text-base font-semibold">
              {isEdit ? "Edit User" : "Add User"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? `Update details for ${editingUser.name}.`
                : "Create a staff account and assign a role."}
            </DialogDescription>
          </CompactDialogHeader>

          <CompactDialogBody>
            {/* Name fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  autoComplete="given-name"
                  placeholder="John"
                  className="h-11 rounded-xl border-gray-200 text-sm"
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  autoComplete="family-name"
                  placeholder="Smith"
                  className="h-11 rounded-xl border-gray-200 text-sm"
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email — create only */}
            {!isEdit && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  className="h-11 rounded-xl border-gray-200 text-sm"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            )}

            {/* Password — create only */}
            {!isEdit && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  className="h-11 rounded-xl border-gray-200 text-sm"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            )}

            {/* Phone */}
            <div className="space-y-1.5">
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneNumberInput
                    label="Phone"
                    value={field.value as PhoneValue}
                    placeholder="700 000 000"
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Role — create only */}
            {!isEdit && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Role
                </Label>
                <Select disabled value="cashier">
                  <SelectTrigger className="max-w-35">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CompactDialogBody>

          <CompactDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl border-gray-200 text-sm"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl text-sm font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEdit ? "Save Changes" : "Create User"}
            </Button>
          </CompactDialogFooter>
        </form>
      </CompactDialogContent>
    </Dialog>
  );
}
