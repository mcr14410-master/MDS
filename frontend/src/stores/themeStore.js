import { create } from 'zustand';

const useThemeStore = create((set) => ({
  // State
  isDark: localStorage.getItem('theme') === 'dark' || false,

  // Actions
  toggleTheme: () => set((state) => {
    const newIsDark = !state.isDark;
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    
    // Update HTML class
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    return { isDark: newIsDark };
  }),

  setTheme: (isDark) => set(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Update HTML class
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    return { isDark };
  }),

  initializeTheme: () => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    set({ isDark });
  },
}));

export { useThemeStore };
