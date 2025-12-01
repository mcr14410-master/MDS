// frontend/src/components/WikiArticleForm.jsx
import { useState, useEffect } from 'react';
import { useWikiStore } from '../stores/wikiStore';
import { useMachinesStore } from '../stores/machinesStore';
import { toast } from './Toaster';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export default function WikiArticleForm({ article, categories, onClose, onSuccess, initialData }) {
  const { createArticle, updateArticle, uploadImage, deleteImage, loading } = useWikiStore();
  const { machines, fetchMachines } = useMachinesStore();
  const isEdit = !!article;

  const [formData, setFormData] = useState({
    category_id: initialData?.category_id || '',
    machine_id: initialData?.machine_id || '',
    control_type: initialData?.control_type || '',
    error_code: '',
    title: '',
    problem: '',
    cause: '',
    solution: '',
    maintenance_plan_id: '',
    tags: '',
    is_published: true
  });

  const [maintenancePlans, setMaintenancePlans] = useState([]);
  const [planSearch, setPlanSearch] = useState('');
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Selected category for conditional fields
  const selectedCategory = categories.find(c => c.id === parseInt(formData.category_id));

  useEffect(() => {
    fetchMachines();
    fetchMaintenancePlans();
  }, []);

  useEffect(() => {
    if (article) {
      setFormData({
        category_id: article.category_id || '',
        machine_id: article.machine_id || '',
        control_type: article.control_type || '',
        error_code: article.error_code || '',
        title: article.title || '',
        problem: article.problem || '',
        cause: article.cause || '',
        solution: article.solution || '',
        maintenance_plan_id: article.maintenance_plan_id || '',
        tags: article.tags || '',
        is_published: article.is_published !== false
      });
    }
  }, [article]);

  const fetchMaintenancePlans = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.MAINTENANCE}/plans`);
      setMaintenancePlans(response.data.data || []);
    } catch (error) {
      console.error('Error fetching maintenance plans:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_id || !formData.title) {
      toast.error('Kategorie und Titel sind erforderlich');
      return;
    }

    try {
      const data = {
        ...formData,
        category_id: parseInt(formData.category_id),
        machine_id: formData.machine_id ? parseInt(formData.machine_id) : null,
        maintenance_plan_id: formData.maintenance_plan_id ? parseInt(formData.maintenance_plan_id) : null
      };

      if (isEdit) {
        await updateArticle(article.id, data);
        toast.success('Artikel aktualisiert');
      } else {
        await createArticle(data);
        toast.success('Artikel erstellt');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async () => {
    if (!selectedFile || !article?.id) return;
    
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', selectedFile);
      
      await uploadImage(article.id, formDataUpload);
      toast.success('Bild hochgeladen');
      setSelectedFile(null);
    } catch (error) {
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleImageDelete = async (imageId) => {
    if (!confirm('Bild wirklich löschen?')) return;
    try {
      await deleteImage(imageId);
      toast.success('Bild gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Control types for dropdown
  const controlTypes = ['Heidenhain', 'Siemens', 'Fanuc', 'Mazatrol', 'Haas', 'Okuma', 'Mitsubishi'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Artikel bearbeiten' : 'Neuer Wiki-Artikel'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category & Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategorie *
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="">Kategorie wählen...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Code - only for error categories */}
            {selectedCategory?.has_error_code && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fehlercode
                </label>
                <input
                  type="text"
                  name="error_code"
                  value={formData.error_code}
                  onChange={handleChange}
                  placeholder="z.B. FE 3105"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono"
                />
              </div>
            )}
          </div>

          {/* Machine / Control Type - only for machine reference categories */}
          {selectedCategory?.has_machine_reference && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maschine (spezifisch)
                </label>
                <select
                  name="machine_id"
                  value={formData.machine_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">Allgemein (keine Maschine)</option>
                  {machines.filter(m => m.is_active).map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leer = gilt für alle Maschinen
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Steuerungstyp
                </label>
                <select
                  name="control_type"
                  value={formData.control_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">Alle Steuerungen</option>
                  {controlTypes.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leer = gilt für alle Steuerungstypen
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titel *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Kurze, prägnante Beschreibung"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Problem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Problem / Symptom
            </label>
            <textarea
              name="problem"
              value={formData.problem}
              onChange={handleChange}
              rows="3"
              placeholder="Was ist das Problem? Wie äußert es sich?"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Cause */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ursache
            </label>
            <textarea
              name="cause"
              value={formData.cause}
              onChange={handleChange}
              rows="2"
              placeholder="Was verursacht das Problem?"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Solution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lösung
            </label>
            <textarea
              name="solution"
              value={formData.solution}
              onChange={handleChange}
              rows="5"
              placeholder="Schritt-für-Schritt Anleitung zur Lösung"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Maintenance Plan Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wartungsplan verknüpfen
            </label>
            <div className="relative">
              {/* Selected Plan Display or Search Input */}
              {formData.maintenance_plan_id && !showPlanDropdown ? (
                <div className="flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <span className="text-gray-900 dark:text-white">
                    {maintenancePlans.find(p => p.id === parseInt(formData.maintenance_plan_id))?.title || 'Wartungsplan'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, maintenance_plan_id: '' }));
                      setPlanSearch('');
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={planSearch}
                  onChange={(e) => {
                    setPlanSearch(e.target.value);
                    setShowPlanDropdown(true);
                  }}
                  onFocus={() => setShowPlanDropdown(true)}
                  placeholder="Wartungsplan suchen..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              )}
              
              {/* Dropdown */}
              {showPlanDropdown && !formData.maintenance_plan_id && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {/* Kein Wartungsplan Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, maintenance_plan_id: '' }));
                      setPlanSearch('');
                      setShowPlanDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                  >
                    Kein Wartungsplan
                  </button>
                  
                  {/* Filtered Plans */}
                  {maintenancePlans
                    .filter(plan => 
                      plan.title?.toLowerCase().includes(planSearch.toLowerCase()) ||
                      plan.machine_name?.toLowerCase().includes(planSearch.toLowerCase())
                    )
                    .slice(0, 20)
                    .map(plan => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, maintenance_plan_id: plan.id }));
                          setPlanSearch('');
                          setShowPlanDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{plan.title}</div>
                        {plan.machine_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.machine_name}
                          </div>
                        )}
                      </button>
                    ))}
                  
                  {maintenancePlans.filter(plan => 
                    plan.title?.toLowerCase().includes(planSearch.toLowerCase()) ||
                    plan.machine_name?.toLowerCase().includes(planSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                      Keine Wartungspläne gefunden
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Wartungsplan, der zur Lösung ausgeführt werden soll
            </p>
            
            {/* Click outside to close dropdown */}
            {showPlanDropdown && (
              <div 
                className="fixed inset-0 z-0" 
                onClick={() => setShowPlanDropdown(false)}
              />
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="Kommasepariert: Spindel, Schmierung, Alarm"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Published Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_published" className="text-sm text-gray-700 dark:text-gray-300">
              Artikel veröffentlichen (sichtbar für alle)
            </label>
          </div>

          {/* Image Upload - only in edit mode */}
          {isEdit && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bilder</h3>
              
              {/* Existing Images */}
              {article.images && article.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {article.images.map(img => (
                    <div key={img.id} className="relative group">
                      <img
                        src={`${API_ENDPOINTS.WIKI}/images/${img.id}/view`}
                        alt={img.caption || 'Wiki Bild'}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageDelete(img.id)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload New */}
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100"
                />
                <button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={!selectedFile || uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Lädt...' : 'Hochladen'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Speichert...' : isEdit ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
