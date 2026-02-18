import { create } from 'zustand';

interface ElderlyInfo {
  id: string;
  name: string;
  phone: string;
}

interface FamilyState {
  // Monitored elderly list
  elderlyList: ElderlyInfo[];
  setElderlyList: (list: ElderlyInfo[]) => void;

  // Selected elderly for current view
  selectedElderlyId: string | null;
  selectElderly: (id: string) => void;

  // Convenience getter
  selectedElderly: () => ElderlyInfo | undefined;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  elderlyList: [],
  setElderlyList: (list) => {
    set({ elderlyList: list });
    // Auto-select first if none selected
    if (!get().selectedElderlyId && list.length > 0) {
      set({ selectedElderlyId: list[0].id });
    }
  },

  selectedElderlyId: null,
  selectElderly: (id) => set({ selectedElderlyId: id }),

  selectedElderly: () => {
    const state = get();
    return state.elderlyList.find((e) => e.id === state.selectedElderlyId);
  },
}));
