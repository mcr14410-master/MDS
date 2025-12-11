// frontend/src/pages/PartFormPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { usePartsStore } from '../stores/partsStore';
import { useCustomersStore } from '../stores/customersStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import API_BASE_URL from '../config/api';

export default function PartFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);
  
  const { currentPart, loading, createPart, updatePart, fetchPart } = usePartsStore();
  const { customers, fetchCustomers } = useCustomersStore();
  const { token } = useAuthStore();
  
  // Get customer_id from URL if present (e.g., /parts/new?customer_id=1)
  const urlCustomerId = searchParams.get('customer_id');
  
  const [formData, setFormData] = useState({
    part_number: '',
    part_name: '',
    customer_id: urlCustomerId || '',
    customer_part_number: '',
    revision: 'A',
    material: '',
    dimensions: '',
    description: '',
    notes: '',
    status: 'draft'
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(false);

  // Load part data in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      fetchPart(id);
    }
  }, [isEditMode, id, fetchPart]);

  // Load customers for dropdown
  useEffect(() => {
    fetchCustomers({ is_active: true });
  }, []);

  // Populate form when part is loaded
  useEffect(() => {
    if (isEditMode && currentPart) {
      setFormData({
        part_number: currentPart.part_number || '',
        part_name: currentPart.part_name || '',
        customer_id: currentPart.customer_id || '',
        customer_part_number: currentPart.customer_part_number || '',
        revision: currentPart.revision || 'A',
        material: currentPart.material || '',
        dimensions: currentPart.dimensions || '',
        description: currentPart.description || '',
        notes: currentPart.notes || '',
        status: currentPart.status || 'draft'
      });
    }
  }, [isEditMode, currentPart]);

  // Teilenummer generieren
  const handleGeneratePartNumber = async () => {
    if (!formData.customer_id) {
      toast.error('Bitte zuerst einen Kunden auswählen');
      return;
    }

    setGeneratingNumber(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/parts/generate-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ customer_id: parseInt(formData.customer_id) })
      });

      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          part_number: data.part_number
        }));
        toast.success(`Teilenummer generiert: ${data.part_number}`);
      } else {
        throw new Error(data.error || 'Fehler beim Generieren');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGeneratingNumber(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.customer_id) {
      newErrors.customer_id = 'Kunde ist erforderlich';
    }
    
    if (!formData.part_number.trim()) {
      newErrors.part_number = 'Bauteilnummer ist erforderlich';
    }
    
    if (!formData.part_name.trim()) {
      newErrors.part_name = 'Bezeichnung ist erforderlich';
    }
    
    if (formData.part_number.length > 50) {
      newErrors.part_number = 'Bauteilnummer darf maximal 50 Zeichen lang sein';
    }
    
    if (formData.part_name.length > 200) {
      newErrors.part_name = 'Bezeichnung darf maximal 200 Zeichen lang sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Bitte prüfe die Eingaben');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare data - convert empty strings to null
      const dataToSubmit = {
        part_number: formData.part_number.trim(),
        part_name: formData.part_name.trim(),
        customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
        customer_part_number: formData.customer_part_number.trim() || null,
        revision: formData.revision.trim() || 'A',
        material: formData.material.trim() || null,
        dimensions: formData.dimensions.trim() || null,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status || 'draft'
      };

      // Remove null values to prevent overwriting in edit mode
      if (isEditMode) {
        Object.keys(dataToSubmit).forEach(key => {
          if (dataToSubmit[key] === null || dataToSubmit[key] === '') {
            delete dataToSubmit[key];
          }
        });
      }

      if (isEditMode) {
        await updatePart(id, dataToSubmit);
        toast.success('Bauteil erfolgreich aktualisiert');
        setTimeout(() => navigate(`/parts/${id}`), 500);// ← 500ms Delay
      } else {
        const result = await createPart(dataToSubmit);
        if (result.success && result.part) {	
          toast.success('Bauteil erfolgreich erstellt');
          setTimeout(() => navigate(`/parts/${result.part.id}`), 500);  // ← 500ms Delay
        } else {
          throw new Error(result.error || 'Unbekannter Fehler');
        }
      }
    } catch (err) {
      console.error('Form submit error:', err);
      toast.error(err.message || 'Fehler beim Speichern');
      setSubmitting(false);
    }
  };

  if (isEditMode && loading && !currentPart) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Bauteil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={isEditMode ? `/parts/${id}` : '/parts'}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isEditMode ? 'Bauteil bearbeiten' : 'Neues Bauteil erstellen'}
        </h1>
        {isEditMode && currentPart && (
          <p className="mt-1 text-gray-600 dark:text-gray-400">{currentPart.part_number}</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          {/* Basic Info Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grunddaten</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer - ZUERST, da Pflichtfeld für Teilenummer-Generierung */}
              <div>
                <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kunde <span className="text-red-500">*</span>
                </label>
                <select
                  id="customer_id"
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white ${
                    errors.customer_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">-- Kunde auswählen --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_number} - {customer.name}
                    </option>
                  ))}
                </select>
                {errors.customer_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customer_id}</p>
                )}
              </div>

              {/* Part Number mit Generieren-Button */}
              <div>
                <label htmlFor="part_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bauteilnummer <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="part_number"
                    name="part_number"
                    value={formData.part_number}
                    onChange={handleChange}
                    className={`flex-1 px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white ${
                      errors.part_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="z.B. K-001-00001"
                    maxLength={50}
                  />
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={handleGeneratePartNumber}
                      disabled={!formData.customer_id || generatingNumber}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        formData.customer_id && !generatingNumber
                          ? 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                      title={!formData.customer_id ? 'Zuerst Kunde auswählen' : 'Teilenummer automatisch generieren'}
                    >
                      {generatingNumber ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        '# Auto'
                      )}
                    </button>
                  )}
                </div>
                {errors.part_number && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.part_number}</p>
                )}
              </div>

              {/* Part Name */}
              <div>
                <label htmlFor="part_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bezeichnung <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="part_name"
                  name="part_name"
                  value={formData.part_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white ${
                    errors.part_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="z.B. Gehäuse Deckel"
                  maxLength={200}
                />
                {errors.part_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.part_name}</p>
                )}
              </div>

              {/* Customer Part Number */}
              <div>
                <label htmlFor="customer_part_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kunden-Zeichnungsnummer
                </label>
                <input
                  type="text"
                  id="customer_part_number"
                  name="customer_part_number"
                  value={formData.customer_part_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="z.B. DRW-2024-001"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Zeichnungsnummer des Kunden (optional)
                </p>
              </div>

              {/* Revision */}
              <div>
                <label htmlFor="revision" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Revision
                </label>
                <input
                  type="text"
                  id="revision"
                  name="revision"
                  value={formData.revision}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="z.B. A, B, C"
                  maxLength={10}
                />
              </div>

              {/* Material */}
              <div>
                <label htmlFor="material" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Material
                </label>
                <input
                  type="text"
                  id="material"
                  name="material"
                  value={formData.material}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="z.B. Aluminium 6061"
                  maxLength={100}
                />
              </div>

              {/* Raw Material */}
              <div>
                <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Abmessungen
                </label>
                <input
                  type="text"
                  id="dimensions"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="z.B. Rund Ø50 x 100"
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zusatzinformationen</h2>
            
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beschreibung
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="Beschreibung des Bauteils..."
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notizen
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="Interne Notizen..."
                />
              </div>

              {/* Hinweis auf Dokumenten-Tab */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">CAD-Dateien & Zeichnungen</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                      {isEditMode 
                        ? 'Dokumente können im Tab "Dokumente" hochgeladen werden.'
                        : 'Dokumente können nach dem Erstellen im Tab "Dokumente" hochgeladen werden.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="draft">Entwurf</option>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="obsolete">Veraltet</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={isEditMode ? `/parts/${id}` : '/parts'}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ${
                submitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isEditMode ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
