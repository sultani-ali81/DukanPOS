// src/pages/users/components/user-dialog.tsx
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
import { Select, SelectItem, SelectTrigger } from "@/components/ui/select";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UserRole,
} from "@/types/user";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Value as PhoneValue } from "react-phone-number-input";

export interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: UserRole;
}

interface UserDialogProps {
  open: boolean;
  editingUser: User | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    payload: CreateUserPayload | UpdateUserPayload,
    id?: string,
  ) => Promise<void>;
}

export function UserDialog({
  open,
  editingUser,
  onOpenChange,
  onSubmit,
}: UserDialogProps) {
  const isEdit = !!editingUser;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "Cashier",
    },
  });

  useEffect(() => {
    reset({
      name: editingUser?.name ?? "",
      email: editingUser?.email ?? "",
      password: "",
      phone: editingUser?.phone ?? "",
      role: editingUser?.role ?? "Cashier",
    });
  }, [editingUser, open, reset]);

  async function submit(values: UserFormValues) {
    const payload = isEdit
      ? ({ name: values.name, phone: values.phone } as UpdateUserPayload)
      : ({
          name: values.name,
          email: values.email,
          password: values.password,
          phone: values.phone,
          role: values.role,
        } as CreateUserPayload);

    await onSubmit(payload, editingUser?.id);
    onOpenChange(false);
    reset({ name: "", email: "", password: "", phone: "", role: "Cashier" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-base font-semibold">
              {isEdit ? "Edit User" : "Add User"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? `Update details for ${editingUser.name}.`
                : "Create a staff account and assign a role."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="John Smith"
                className="h-11 rounded-xl border-gray-200 text-sm"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
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
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
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
                  placeholder="Min 6 characters"
                  className="h-11 rounded-xl border-gray-200 text-sm"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "At least 6 characters" },
                  })}
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
                <Select disabled>
                  <SelectTrigger className="max-w-35">
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectTrigger>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="px-5 pb-5 flex gap-2">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
