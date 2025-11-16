import { create } from 'zustand';
import axios from '../utils/axios';
import API_BASE_URL from '../config/api';

export const useToolDocumentsStore = create((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================
  documents: [],
  stats: null,
  loading: false,
  uploading: false,
  error: null,

  // ============================================================================
  // DOCUMENT OPERATIONS
  // ============================================================================

  /**
   * Fetch all documents for a tool
   */
  fetchDocuments: async (toolId) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`/api/tools/${toolId}/documents`);

      set({
        documents: response.data.data || [],
        loading: false,
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('fetchDocuments error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Dokumente';
      set({
        loading: false,
        error: errorMessage,
        documents: [],
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Fetch document statistics for a tool
   */
  fetchDocumentStats: async (toolId) => {
    try {
      const response = await axios.get(`/api/tools/${toolId}/documents/stats`);

      set({
        stats: response.data.data,
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('fetchDocumentStats error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Statistiken';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Upload document
   */
  uploadDocument: async (toolId, formData) => {
    try {
      set({ uploading: true, error: null });

      const response = await axios.post(
        `/api/tools/${toolId}/documents/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Add new document to list
      set((state) => ({
        documents: [response.data.data, ...state.documents],
        uploading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('uploadDocument error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Hochladen des Dokuments';
      set({
        uploading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Download document
   */
  downloadDocument: async (documentId, fileName) => {
    try {
      const response = await axios.get(
        `/api/tool-documents/${documentId}/download`,
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('downloadDocument error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Herunterladen des Dokuments';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update document metadata
   */
  updateDocument: async (documentId, data) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.put(`/api/tool-documents/${documentId}`, data);

      // Update document in list
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === documentId ? response.data.data : doc
        ),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('updateDocument error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Dokuments';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete document
   */
  deleteDocument: async (documentId) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.delete(`/api/tool-documents/${documentId}`);

      // Remove document from list
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== documentId),
        loading: false,
      }));

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('deleteDocument error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Dokuments';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Set document as primary (main document)
   */
  setPrimaryDocument: async (documentId) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.put(`/api/tool-documents/${documentId}/set-primary`);

      // Update documents list: unset old primary, set new primary
      set((state) => ({
        documents: state.documents.map((doc) => ({
          ...doc,
          is_primary: doc.id === documentId ? true : false,
        })),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('setPrimaryDocument error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Setzen des Hauptdokuments';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * View document in new tab
   * Opens the document in browser (PDF viewer, image viewer, etc.)
   * Adds token as query parameter since headers can't be set with window.open
   * Uses absolute URL with backend port (e.g. http://localhost:5000)
   */
  viewDocument: async (documentId, fileName) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        const errorMessage = 'Kein Authentifizierungs-Token gefunden';
        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      }

      // Build absolute URL with backend baseURL (important for window.open!)
      // Frontend runs on :5173, Backend on :5000
      const url = `${API_BASE_URL}/api/tool-documents/${documentId}/download?token=${token}&view=true`;
      
      // Open in new tab
      window.open(url, '_blank');

      return { success: true };
    } catch (error) {
      console.error('viewDocument error:', error);
      const errorMessage = 'Fehler beim Öffnen des Dokuments';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get document type label in German
   */
  getDocumentTypeLabel: (type) => {
    const labels = {
      datasheet: 'Datenblatt',
      drawing: 'Zeichnung',
      certificate: 'Zertifikat',
      manual: 'Handbuch',
      photo: 'Foto',
      other: 'Sonstiges',
    };
    return labels[type] || type;
  },

  /**
   * Get document type color
   */
  getDocumentTypeColor: (type) => {
    const colors = {
      datasheet: 'blue',
      drawing: 'purple',
      certificate: 'green',
      manual: 'orange',
      photo: 'pink',
      other: 'gray',
    };
    return colors[type] || 'gray';
  },

  /**
   * Format file size for display
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Get file extension from filename
   */
  getFileExtension: (filename) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  },

  /**
   * Get icon for file type
   */
  getFileIcon: (mimeType, filename) => {
    const ext = get().getFileExtension(filename);

    // PDFs
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return 'FileText';
    }

    // Images
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
      return 'Image';
    }

    // CAD files
    if (['dxf', 'dwg', 'step', 'stp', 'iges', 'igs'].includes(ext)) {
      return 'Box';
    }

    // Archives
    if (['zip', 'rar', '7z'].includes(ext)) {
      return 'Archive';
    }

    // Documents
    if (['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'].includes(ext)) {
      return 'FileText';
    }

    return 'File';
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () => set({
    documents: [],
    stats: null,
    loading: false,
    uploading: false,
    error: null,
  }),
}));
