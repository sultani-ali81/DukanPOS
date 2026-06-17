import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UtilsState = {
  inventoryId: string;
  setInventoryId: (id: string) => void;
  inventoryLabel: string;
  setInventoryLabel: (label: string) => void;
  clearUtilsStore: () => void;
};

export const useUtilsStore = create<UtilsState>()(
  persist(
    (set, get) => ({
      inventoryId: "",
      inventoryLabel: "",

      setInventoryId: (id: string) => {
        set({ inventoryId: id });
      },
      getInventoryId: () => {
        return get().inventoryId;
      },
      setInventoryLabel: (label: string) => {
        set({ inventoryLabel: label });
      },
      getInventoryLabel: () => {
        return get().inventoryLabel;
      },
      clearUtilsStore: () => {
        console.log("Clearing utils store");
        set({ inventoryId: "", inventoryLabel: "" });
      },
    }),
    {
      name: "utils-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
