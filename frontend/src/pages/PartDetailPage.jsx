// frontend/src/pages/PartDetailPage.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePartsStore } from '../stores/partsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import OperationsAccordion from '../components/OperationsAccordion';
import StepViewer from '../components/common/StepViewer';
import PdfViewer from '../components/common/PdfViewer';
import PartDocuments from '../components/PartDocuments';
import API_BASE_URL from '../config/api';

// Status-Konfiguration
const STATUS_CONFIG = {
  draft: { label: 'Entwurf', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  active: { label: 'Aktiv', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  inactive: { label: 'Inaktiv', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' },
  obsolete: { label: 'Veraltet', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' }
};

export default function PartDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPart, loading, error, fetchPart, deletePart, updatePart } = usePartsStore();
  const { hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'operations', 'documents'
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const statusDropdownRef = useRef(null);

  // Bauteil neu laden wenn Dokumente geändert wurden
  const handleDocumentChange = () => {
    fetchPart(id);
  };

  // Dropdown schließen bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status direkt ändern
  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentPart.status) {
      setStatusDropdownOpen(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      await updatePart(id, { status: newStatus });
      toast.success(`Status geändert: ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchPart(id); // Neu laden für aktuelle Daten
    } catch (err) {
      toast.error(err.message || 'Fehler beim Ändern des Status');
    } finally {
      setUpdatingStatus(false);
      setStatusDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPart(id);
    }
  }, [id, fetchPart]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmDelete = async () => {
    try {
      await deletePart(id);
      toast.success('Bauteil erfolgreich gelöscht');
      setShowDeleteConfirm(false);
      navigate('/parts');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Bauteil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Fehler</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Link
            to="/parts"
            className="mt-4 inline-block text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!currentPart) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Nicht gefunden</h2>
          <p className="text-yellow-600 dark:text-yellow-300">Bauteil wurde nicht gefunden.</p>
          <Link
            to="/parts"
            className="mt-4 inline-block text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 font-medium"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const part = currentPart;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/parts')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            title="Zurück zur Übersicht"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono truncate">
              {part.part_number}
            </h1>
            {part.part_name && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                {part.part_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => hasPermission('part.update') && setStatusDropdownOpen(!statusDropdownOpen)}
              disabled={updatingStatus}
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
                STATUS_CONFIG[part.status]?.bg || 'bg-gray-100 dark:bg-gray-700'
              } ${STATUS_CONFIG[part.status]?.text || 'text-gray-800 dark:text-gray-300'} ${
                hasPermission('part.update') ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 dark:hover:ring-gray-600' : 'cursor-default'
              }`}
              title={hasPermission('part.update') ? 'Klicken zum Ändern' : ''}
            >
              {updatingStatus ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : null}
              {STATUS_CONFIG[part.status]?.label || part.status}
              {hasPermission('part.update') && !updatingStatus && (
                <svg className={`w-3 h-3 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {statusDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                      part.status === status ? 'font-medium' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${config.bg}`}></span>
                    <span className={part.status === status ? config.text : 'text-gray-700 dark:text-gray-300'}>
                      {config.label}
                    </span>
                    {part.status === status && (
                      <svg className="w-4 h-4 ml-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasPermission('part.update') && (
            <Link
              to={`/parts/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Bearbeiten
            </Link>
          )}

          {hasPermission('part.delete') && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center p-2 border border-red-300 dark:border-red-600 rounded-lg shadow-sm text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Löschen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Dokumente
            {part.document_counts?.total > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                {part.document_counts.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'operations'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Arbeitsgänge
          </button>
          
          {/* Historie Tab - rechts ausgerichtet */}
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ml-auto ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Historie
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Bauteil-Details</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Bauteilnummer
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{part.part_number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Bezeichnung
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{part.part_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Kunde
                  </label>
                  {part.customer_id ? (
                    <Link 
                      to={`/customers/${part.customer_id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                    >
                      {part.customer_name}
                    </Link>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">–</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Kunden-Zeichnungsnr.
                  </label>
                  <p className={part.customer_part_number ? "text-gray-900 dark:text-gray-100 font-mono" : "text-gray-500 dark:text-gray-400"}>
                    {part.customer_part_number || '–'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Revision
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono">{part.revision || 'A'}</p>
                </div>
              </div>

              {/* Material & Abmessungen */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Material
                  </label>
                  <p className={part.material ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
                    {part.material || '–'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Abmessungen
                  </label>
                  <p className={part.dimensions ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
                    {part.dimensions || '–'}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Beschreibung
                </label>
                <p className={part.description ? "text-gray-700 dark:text-gray-300 whitespace-pre-wrap" : "text-gray-500 dark:text-gray-400"}>
                  {part.description || '–'}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Notizen
                </label>
                <p className={part.notes ? "text-gray-700 dark:text-gray-300 whitespace-pre-wrap" : "text-gray-500 dark:text-gray-400"}>
                  {part.notes || '–'}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* 3D-Vorschau - ZUERST */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              {part.primary_cad_file ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      3D-Vorschau
                    </h3>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const token = localStorage.getItem('token');
                        fetch(`${API_BASE_URL}/api/parts/${part.id}/cad-file/${encodeURIComponent(part.primary_cad_file.original_filename)}`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        })
                        .then(res => res.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = part.primary_cad_file.original_filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          a.remove();
                        });
                      }}
                      className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Herunterladen"
                    >
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                  <StepViewer 
                    fileUrl={`${API_BASE_URL}/api/parts/${part.id}/cad-file/${encodeURIComponent(part.primary_cad_file.original_filename)}`}
                    fileName={part.primary_cad_file.original_filename}
                    className="h-48"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {part.primary_cad_file.original_filename}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    3D-Vorschau
                  </h3>
                  <div className="h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Kein 3D-Modell</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Im Tab "Dokumente" hochladen</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Zeichnungs-Vorschau */}
            {part.primary_drawing_file && part.primary_drawing_file.original_filename?.toLowerCase().endsWith('.pdf') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Hauptzeichnung
                  </h3>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const token = localStorage.getItem('token');
                      fetch(`${API_BASE_URL}/api/parts/${part.id}/documents/${part.primary_drawing_file.id}/download`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                      .then(res => res.blob())
                      .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = part.primary_drawing_file.original_filename;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                      });
                    }}
                    className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Herunterladen"
                  >
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
                <PdfViewer 
                  fileUrl={`${API_BASE_URL}/api/parts/${part.id}/documents/${part.primary_drawing_file.id}/download`}
                  fileName={part.primary_drawing_file.original_filename}
                  className="h-48"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {part.primary_drawing_file.original_filename}
                </p>
              </div>
            )}

            {/* Hauptdokumente Schnellzugriff */}
            {(part.primary_cad_file || part.primary_drawing_file) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Hauptdokumente
                </h3>
                <div className="space-y-2">
                  {/* Hauptzeichnung */}
                  {part.primary_drawing_file && (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const token = localStorage.getItem('token');
                        fetch(`${API_BASE_URL}/api/parts/${part.id}/documents/${part.primary_drawing_file.id}/download`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        })
                        .then(res => res.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = part.primary_drawing_file.original_filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          a.remove();
                        });
                      }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Hauptzeichnung
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {part.primary_drawing_file.original_filename}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  )}

                  {/* CAD-Modell */}
                  {part.primary_cad_file && (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const token = localStorage.getItem('token');
                        fetch(`${API_BASE_URL}/api/parts/${part.id}/cad-file/${encodeURIComponent(part.primary_cad_file.original_filename)}`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        })
                        .then(res => res.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = part.primary_cad_file.original_filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          a.remove();
                        });
                      }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          3D-Modell
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {part.primary_cad_file.original_filename}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Meta Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadaten</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Erstellt
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 text-sm">
                    {new Date(part.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {part.created_by_username && (
                      <span className="text-gray-500 dark:text-gray-400"> – {part.created_by_username}</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Geändert
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 text-sm">
                    {new Date(part.updated_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {part.updated_by_username && (
                      <span className="text-gray-500 dark:text-gray-400"> – {part.updated_by_username}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'documents' ? (
        /* Documents Tab */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Dokumente</h2>
          <PartDocuments partId={id} onDocumentChange={handleDocumentChange} />
        </div>
      ) : activeTab === 'operations' ? (
        /* Operations Tab - Accordion */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <OperationsAccordion partId={id} />
        </div>
      ) : activeTab === 'history' ? (
        /* History Tab */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Änderungshistorie</h2>
          <PartHistory partId={id} />
        </div>
      ) : null}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Bauteil löschen?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Das Bauteil <strong>{part.part_number}</strong>
              {part.part_name && <> ({part.part_name})</>} wird gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PartHistory Komponente - Inline definiert
function PartHistory({ partId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/parts/${partId}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setHistory(data.history || []);
        } else {
          throw new Error(data.error || 'Fehler beim Laden');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (partId) {
      fetchHistory();
    }
  }, [partId, token]);

  // Action Labels
  const ACTION_LABELS = {
    CREATE: { label: 'Erstellt', icon: '➕', color: 'text-green-600 dark:text-green-400' },
    UPDATE: { label: 'Geändert', icon: '✏️', color: 'text-blue-600 dark:text-blue-400' },
    DELETE: { label: 'Gelöscht', icon: '🗑️', color: 'text-red-600 dark:text-red-400' },
    STATUS_CHANGE: { label: 'Status geändert', icon: '🔄', color: 'text-yellow-600 dark:text-yellow-400' }
  };

  // Feld-Labels für bessere Lesbarkeit
  const FIELD_LABELS = {
    part_number: 'Bauteilnummer',
    part_name: 'Bezeichnung',
    customer_id: 'Kunde',
    customer_part_number: 'Kunden-Zeichnungsnr.',
    revision: 'Revision',
    material: 'Material',
    dimensions: 'Abmessungen',
    description: 'Beschreibung',
    notes: 'Notizen',
    status: 'Status'
  };

  const STATUS_LABELS = {
    draft: 'Entwurf',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    obsolete: 'Veraltet'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>Noch keine Änderungen erfasst</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry, index) => {
        const actionConfig = ACTION_LABELS[entry.action] || { label: entry.action, icon: '📝', color: 'text-gray-600' };
        const changes = entry.changes || {};
        
        return (
          <div 
            key={entry.id || index}
            className="relative pl-8 pb-4 border-l-2 border-gray-200 dark:border-gray-700 last:border-l-0 last:pb-0"
          >
            {/* Timeline Dot */}
            <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"></div>
            
            {/* Content */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{actionConfig.icon}</span>
                  <span className={`font-medium ${actionConfig.color}`}>{actionConfig.label}</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {/* User */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                von <span className="font-medium text-gray-800 dark:text-gray-200">{entry.username || 'System'}</span>
              </p>
              
              {/* Changes */}
              {entry.action === 'UPDATE' && changes.old && changes.new && (
                <div className="mt-3 space-y-2">
                  {Object.keys(changes.new).filter(key => 
                    JSON.stringify(changes.old[key]) !== JSON.stringify(changes.new[key])
                  ).map(key => {
                    const oldVal = changes.old[key];
                    const newVal = changes.new[key];
                    const fieldLabel = FIELD_LABELS[key] || key;
                    
                    // Status-Werte übersetzen
                    const displayOld = key === 'status' ? (STATUS_LABELS[oldVal] || oldVal) : (oldVal || '–');
                    const displayNew = key === 'status' ? (STATUS_LABELS[newVal] || newVal) : (newVal || '–');
                    
                    return (
                      <div key={key} className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{fieldLabel}:</span>
                        <span className="ml-2 line-through text-red-500 dark:text-red-400">{displayOld}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-green-600 dark:text-green-400">{displayNew}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Reason if provided */}
              {entry.reason && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                  Grund: {entry.reason}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
