import { create } from 'zustand';

const STORAGE_KEY = 'mds-ui-preferences';

// Standardwerte
const defaultPreferences = {
  viewModes: {
    customers: 'grid',
    parts: 'grid',
    tools: 'grid',
    consumables: 'grid',
    suppliers: 'grid',
    measuringEquipment: 'grid',
    // Weitere Seiten hier hinzufügen
  },
  // Später erweiterbar:
  // sidebarCollapsed: false,
  // tableRowsPerPage: 25,
};

// Aus localStorage laden
const loadPreferences = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge mit Defaults (falls neue Keys hinzukommen)
      return {
        ...defaultPreferences,
        ...parsed,
        viewModes: {
          ...defaultPreferences.viewModes,
          ...(parsed.viewModes || {}),
        },
      };
    }
  } catch (e) {
    console.error('Error loading preferences:', e);
  }
  return defaultPreferences;
};

// In localStorage speichern
const savePreferences = (preferences) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (e) {
    console.error('Error saving preferences:', e);
  }
};

const usePreferencesStore = create((set, get) => ({
  // State
  ...loadPreferences(),

  // Actions
  setViewMode: (page, mode) => {
    set((state) => {
      const newState = {
        ...state,
        viewModes: {
          ...state.viewModes,
          [page]: mode,
        },
      };
      savePreferences(newState);
      return newState;
    });
  },

  getViewMode: (page) => {
    return get().viewModes[page] || 'grid';
  },

  // Für spätere Erweiterungen
  setPreference: (key, value) => {
    set((state) => {
      const newState = {
        ...state,
        [key]: value,
      };
      savePreferences(newState);
      return newState;
    });
  },

  resetPreferences: () => {
    savePreferences(defaultPreferences);
    set(defaultPreferences);
  },
}));

export { usePreferencesStore };
