import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCustomersStore } from '../stores/customersStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import ContactFormModal from '../components/customers/ContactFormModal';
import CustomerDocumentsSection from '../components/customers/CustomerDocumentsSection';
import AuthImage from '../components/common/AuthImage';
import axios from '../utils/axios';
import API_BASE_URL from '../config/api';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentCustomer, loading, error, fetchCustomer, deleteCustomer, clearCurrentCustomer } = useCustomersStore();
  const { hasPermission } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null); // 'soft' | 'hard' | null
  const [primaryDoc, setPrimaryDoc] = useState(null);

  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/customers/${id}/contacts`);
      setContacts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  const fetchPrimaryDoc = async () => {
    try {
      const response = await axios.get(`/api/customers/${id}/documents`);
      const docs = response.data.data || [];
      const primary = docs.find((d) => d.is_primary && d.mime_type?.startsWith('image/'));
      setPrimaryDoc(primary || null);
    } catch (err) {
      console.error('Error loading primary doc:', err);
    }
  };

  useEffect(() => {
    fetchCustomer(id);
    fetchContacts();
    fetchPrimaryDoc();
    return () => clearCurrentCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = (success) => {
    setIsModalOpen(false);
    if (success) {
      fetchCustomer(id);
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setIsContactModalOpen(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setIsContactModalOpen(true);
  };

  const handleContactModalClose = (success) => {
    setIsContactModalOpen(false);
    setEditingContact(null);
    if (success) {
      fetchContacts();
    }
  };

  const handleDeleteContact = async (contact) => {
    if (!window.confirm(`Ansprechpartner "${contact.name}" wirklich löschen?`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/customers/${id}/contacts/${contact.id}?hard_delete=true`);
      toast.success('Ansprechpartner gelöscht');
      fetchContacts();
    } catch (err) {
      toast.error('Fehler beim Löschen');
    }
  };

  const confirmDelete = async () => {
    const hard = deleteMode === 'hard';
    try {
      await deleteCustomer(currentCustomer.id, hard);
      toast.success(
        hard
          ? `Kunde "${currentCustomer.name}" wurde endgültig gelöscht`
          : `Kunde "${currentCustomer.name}" wurde deaktiviert`
      );
      setDeleteMode(null);
      navigate('/customers');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
      setDeleteMode(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <Link to="/customers" className="text-blue-600 hover:underline mt-2 inline-block">
          ← Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  if (!currentCustomer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            title="Zurück zur Übersicht"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center flex-wrap gap-3">
              {currentCustomer.name}
              {currentCustomer.is_active ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  Aktiv
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  Inaktiv
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kundennummer: <span className="font-mono">{currentCustomer.customer_number}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
            {hasPermission('part.update') && (
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Bearbeiten
              </button>
            )}
            {hasPermission('part.delete') && currentCustomer.is_active && (
              <button
                onClick={() => setDeleteMode('soft')}
                className="inline-flex items-center justify-center p-2 border border-red-300 dark:border-red-600 rounded-lg shadow-sm text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Deaktivieren"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </button>
            )}
            {hasPermission('part.delete') && !currentCustomer.is_active && (
              <button
                onClick={() => setDeleteMode('hard')}
                className="inline-flex items-center justify-center p-2 border border-red-500 rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
                title="Endgültig löschen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 relative bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {primaryDoc && (
            <div className="absolute top-4 right-4 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-shrink-0">
              <AuthImage
                apiPath={`/api/customers/documents/${primaryDoc.id}/view`}
                alt={primaryDoc.file_name}
                className="w-full h-full object-cover"
                placeholderClassName="w-full h-full"
              />
            </div>
          )}
          <h2 className={`text-lg font-semibold text-gray-900 dark:text-white mb-4 ${primaryDoc ? 'pr-24' : ''}`}>
            Kundendaten
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Kundennummer</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{currentCustomer.customer_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Ansprechpartner</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{currentCustomer.contact_person || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">E-Mail</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {currentCustomer.email ? (
                  <a href={`mailto:${currentCustomer.email}`} className="text-blue-600 hover:underline">
                    {currentCustomer.email}
                  </a>
                ) : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefon</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {currentCustomer.phone ? (
                  <a href={`tel:${currentCustomer.phone}`} className="text-blue-600 hover:underline">
                    {currentCustomer.phone}
                  </a>
                ) : '-'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-line">
                {currentCustomer.address || '-'}
              </dd>
            </div>
            {currentCustomer.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notizen</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-line">
                  {currentCustomer.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Statistik + Metadaten */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistik</h2>
            <Link
              to={`/parts?customer_id=${currentCustomer.id}`}
              className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors group"
              title="Bauteile dieses Kunden anzeigen"
            >
              <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                Bauteile
              </span>
              <span className="flex items-center gap-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {currentCustomer.part_count || 0}
                <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
            <div className="mt-4 flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-300">Ansprechpartner</span>
              <span className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                {contacts.length}
              </span>
            </div>
          </div>

          {/* Metadaten */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>
              Erstellt:{' '}
              <span className="text-gray-700 dark:text-gray-300">
                {new Date(currentCustomer.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
            <div>
              Aktualisiert:{' '}
              <span className="text-gray-700 dark:text-gray-300">
                {new Date(currentCustomer.updated_at).toLocaleDateString('de-DE')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contacts Section (im gleichen Grid wie Kundendaten, Breite matcht) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ansprechpartner ({contacts.length})
          </h2>
          {hasPermission('part.create') && (
            <button
              onClick={handleAddContact}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Hinzufügen
            </button>
          )}
        </div>

        {contactsLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            Keine Ansprechpartner hinterlegt
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                className={`border rounded-lg p-4 ${contact.is_primary ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{contact.name}</span>
                      {contact.is_primary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                          Hauptkontakt
                        </span>
                      )}
                    </div>
                    {contact.position && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{contact.position}</p>
                    )}
                    {contact.department && (
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {contact.department}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {hasPermission('part.update') && (
                      <button
                        onClick={() => handleEditContact(contact)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {hasPermission('part.delete') && (
                      <button
                        onClick={() => handleDeleteContact(contact)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {contact.email && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${contact.email}`} className="hover:text-blue-600">{contact.email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${contact.phone}`} className="hover:text-blue-600">{contact.phone}</a>
                    </div>
                  )}
                  {contact.mobile && (
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <a href={`tel:${contact.mobile}`} className="hover:text-blue-600">{contact.mobile}</a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dokumente */}
      <div className="lg:col-span-2">
        <CustomerDocumentsSection
          customer={currentCustomer}
          canEdit={hasPermission('part.create')}
          canDelete={hasPermission('part.delete')}
          onUpdate={fetchPrimaryDoc}
        />
      </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CustomerFormModal
          customer={currentCustomer}
          onClose={handleModalClose}
        />
      )}

      {/* Contact Modal */}
      {isContactModalOpen && (
        <ContactFormModal
          customerId={id}
          contact={editingContact}
          onClose={handleContactModalClose}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {deleteMode === 'hard' ? 'Kunde endgültig löschen?' : 'Kunde deaktivieren?'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {deleteMode === 'hard' ? (
                <>
                  Der Kunde <strong>{currentCustomer.name}</strong> wird <strong>endgültig</strong> gelöscht.
                  Dieser Vorgang kann nicht rückgängig gemacht werden.
                </>
              ) : (
                <>
                  Der Kunde <strong>{currentCustomer.name}</strong> wird deaktiviert. Die Daten bleiben erhalten
                  und können später wieder aktiviert werden.
                </>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteMode(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {deleteMode === 'hard' ? 'Endgültig löschen' : 'Deaktivieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
