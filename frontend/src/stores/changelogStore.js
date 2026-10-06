import { create } from 'zustand';
import axios from '../utils/axios';
import { useAuthStore } from './authStore';

export const useChangelogStore = create((set) => ({
  // State
  data: null, // { available, currentVersion, lastSeenVersion, isAdmin, versions }
  loading: false,
  error: null,

  fetchChangelog: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get('/api/changelog');
      set({ data: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Laden des Änderungsprotokolls',
      });
      return null;
    }
  },

  // Aktuelle Version als gesehen markieren und User im authStore aktualisieren
  markSeen: async () => {
    try {
      const response = await axios.put('/api/changelog/seen');
      const { user } = useAuthStore.getState();
      if (user) {
        const updatedUser = { ...user, last_seen_version: response.data.lastSeenVersion };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        useAuthStore.setState({ user: updatedUser });
      }
    } catch (error) {
      console.error('Changelog: Markieren als gesehen fehlgeschlagen', error);
    }
  },
}));
