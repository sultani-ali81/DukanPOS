import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UtilsState = {
  inventoryId: string;
  setInventoryId: (id: string) => void;
  inventoryLabel: string;
  setInventoryLabel: (label: string) => void;
  walkInCustomerId: string;
  walkInCustomerLabel: string;
  sessionId: string;
  setWalkInCustomer: (id: string, label: string) => void;
  clearUtilsStore: () => void;
};

export const useUtilsStore = create<UtilsState>()(
  persist(
    (set, get) => ({
      inventoryId: "",
      inventoryLabel: "",
      walkInCustomerId: "",
      walkInCustomerLabel: "",
      sessionId: "",

      setInventoryId: (id: string) => set({ inventoryId: id }),
      setInventoryLabel: (label: string) => set({ inventoryLabel: label }),

      setWalkInCustomer: (id: string, label: string) =>
        set({ walkInCustomerId: id, walkInCustomerLabel: label }),

      clearUtilsStore: () => {
        console.log("Clearing utils store");
        set({
          inventoryId: "",
          inventoryLabel: "",
          walkInCustomerId: "",
          walkInCustomerLabel: "",
          sessionId: "",
        });
      },
      getInventoryId: () => get().inventoryId,
      getInventoryLabel: () => get().inventoryLabel,
    }),
    {
      name: "utils-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
