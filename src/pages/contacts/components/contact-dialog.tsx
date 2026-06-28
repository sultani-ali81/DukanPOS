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
import type { Customer } from "@/types/customer";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Value as PhoneValue } from "react-phone-number-input";

export interface ContactFormValues {
  name: string;
  phone: string;
  address: string;
}

interface ContactDialogProps {
  open: boolean;
  editingCustomer: Customer | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactFormValues, id?: string) => Promise<void>;
}

export function ContactDialog({
  open,
  editingCustomer,
  onOpenChange,
  onSubmit,
}: ContactDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    defaultValues: { name: "", phone: "", address: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: editingCustomer?.name ?? "",
      phone: editingCustomer?.phone ?? "",
      address: editingCustomer?.address ?? "",
    });
  }, [open, editingCustomer, reset]);

  async function submit(values: ContactFormValues) {
    await onSubmit(values, editingCustomer?.id);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? `Update details for ${editingCustomer.name}.`
                : "Add a new customer to your contacts."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-name"
                placeholder="John Smith"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Controller
                control={control}
                name="phone"
                rules={{ required: "Phone is required" }}
                render={({ field }) => (
                  <PhoneNumberInput
                    label="Phone *"
                    value={field.value as PhoneValue}
                    placeholder="700000000"
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
              <Label htmlFor="contact-address">Address</Label>
              <Input
                id="contact-address"
                placeholder="Shahr-e Naw, Kabul"
                {...register("address")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingCustomer ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
