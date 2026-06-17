import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/queries/customer";
import type { Customer, PaginatedCustomers } from "@/types/customer";
import { useCallback, useState } from "react";
import type { KeyedMutator } from "swr";

export function useCustomerDialog(mutate: KeyedMutator<PaginatedCustomers>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleSubmit = useCallback(
    async (
      values: { name: string; phone: string; address: string },
      id?: string,
    ) => {
      if (id) {
        await updateCustomer(id, values);
      } else {
        await createCustomer(values);
      }
      await mutate();
    },
    [mutate],
  );

  const handleDelete = async (id: string) => {
    mutate(
      (prev) =>
        prev ? { ...prev, data: prev.data.filter((c) => c.id !== id) } : prev,
      false,
    );
    await deleteCustomer(id);
    await mutate();
  };

  return {
    dialogOpen,
    setDialogOpen,
    editingCustomer,
    handleOpenCreate,
    handleOpenEdit,
    handleSubmit,
    handleDelete,
  };
}
