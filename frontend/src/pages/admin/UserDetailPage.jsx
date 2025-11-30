import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUsersStore } from '../../stores/usersStore';
import { useRolesStore } from '../../stores/rolesStore';
import { useAuthStore } from '../../stores/authStore';
import Breadcrumbs from '../../components/Breadcrumbs';

function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
    currentUser: userData, 
    userActivity,
    loading, 
    error, 
    fetchUser, 
    updateUser,
    resetPassword,
    toggleActive,
    fetchUserActivity,
    clearCurrentUser
  } = useUsersStore();
  
  const { roles, fetchRoles } = useRolesStore();
  const { hasPermission, user: loggedInUser } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showActivityTab, setShowActivityTab] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    skill_level: 'operator',
    is_available: true,
    role_ids: []
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchUser(id);
    fetchRoles();
    return () => clearCurrentUser();
  }, [id]);

  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        is_active: userData.is_active,
        skill_level: userData.skill_level || 'operator',
        is_available: userData.is_available !== false,
        role_ids: userData.roles?.map(r => r.id) || []
      });
    }
  }, [userData]);

  useEffect(() => {
    if (showActivityTab && userActivity.length === 0) {
      fetchUserActivity(id);
    }
  }, [showActivityTab, id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    
    const result = await updateUser(id, formData);
    if (result.success) {
      setIsEditing(false);
      setSuccessMessage('Benutzer erfolgreich aktualisiert');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setFormError(result.error);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (newPassword.length < 6) {
      setFormError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }
    
    const result = await resetPassword(id, newPassword);
    if (result.success) {
      setShowResetPasswordModal(false);
      setNewPassword('');
      setSuccessMessage('Passwort erfolgreich zurückgesetzt');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setFormError(result.error);
    }
  };

  const handleToggleActive = async () => {
    const result = await toggleActive(id);
    if (result.success) {
      setSuccessMessage(result.is_active ? 'Benutzer aktiviert' : 'Benutzer deaktiviert');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const getRoleBadgeColor = (roleName) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      programmer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      reviewer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      operator: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      helper: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      supervisor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const getSkillLevelInfo = (level) => {
    const levels = {
      helper: { label: 'Helfer', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', description: 'Einfache Wartungsaufgaben' },
      operator: { label: 'Bediener', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', description: 'Standard Wartungsaufgaben' },
      technician: { label: 'Techniker', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', description: 'Komplexe Wartungsaufgaben' },
      specialist: { label: 'Spezialist', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', description: 'Experten-Wartungsaufgaben' }
    };
    return levels[level] || levels.operator;
  };

  const getActionLabel = (action) => {
    const labels = {
      'CREATE': 'Erstellt',
      'UPDATE': 'Aktualisiert',
      'DELETE': 'Gelöscht',
      'LOGIN': 'Anmeldung',
      'LOGOUT': 'Abmeldung'
    };
    return labels[action] || action;
  };

  if (loading && !userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Lade Benutzer...</div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!userData) return null;

  const isOwnProfile = parseInt(id) === loggedInUser?.id;

  const breadcrumbItems = [
    { label: 'Administration', path: '/admin' },
    { label: 'Benutzer', path: '/admin/users' },
    { label: userData.username }
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center relative ${
            userData.is_available === false 
              ? 'bg-gray-200 dark:bg-gray-700' 
              : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            <span className={`text-2xl font-bold ${
              userData.is_available === false 
                ? 'text-gray-400 dark:text-gray-500' 
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {userData.username.charAt(0).toUpperCase()}
            </span>
            {userData.is_available === false && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center" title="Nicht verfügbar">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userData.username}
              {isOwnProfile && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  (Ihr Profil)
                </span>
              )}
              {userData.is_available === false && (
                <span className="ml-2 px-2 py-0.5 text-xs font-normal bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                  Nicht verfügbar
                </span>
              )}
            </h1>
            {userData.full_name && (
              <p className="text-gray-600 dark:text-gray-400">{userData.full_name}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Skill-Level Badge */}
              {userData.skill_level && (
                <span 
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSkillLevelInfo(userData.skill_level).color}`}
                  title={getSkillLevelInfo(userData.skill_level).description}
                >
                  🔧 {getSkillLevelInfo(userData.skill_level).label}
                </span>
              )}
              {/* Rollen */}
              {userData.roles?.map(role => (
                <span 
                  key={role.id}
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(role.name)}`}
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {hasPermission('user.update') && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Bearbeiten
            </button>
          )}
          {hasPermission('user.update') && !isOwnProfile && (
            <button
              onClick={() => setShowResetPasswordModal(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Passwort zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setShowActivityTab(false)}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              !showActivityTab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setShowActivityTab(true)}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              showActivityTab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Aktivitäten
          </button>
        </nav>
      </div>

      {/* Content */}
      {!showActivityTab ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info / Edit Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Benutzerinformationen
            </h2>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {formError}
              </div>
            )}
            
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Benutzername
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vorname
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nachname
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rollen
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {roles.map(role => (
                      <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.role_ids.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, role_ids: [...formData.role_ids, role.id] });
                            } else {
                              setFormData({ ...formData, role_ids: formData.role_ids.filter(rid => rid !== role.id) });
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Skill-Level für Wartung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Skill-Level (Wartung)
                  </label>
                  <select
                    value={formData.skill_level}
                    onChange={(e) => setFormData({ ...formData, skill_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="helper">Helfer - Einfache Wartungsaufgaben</option>
                    <option value="operator">Bediener - Standard Wartungsaufgaben</option>
                    <option value="technician">Techniker - Komplexe Wartungsaufgaben</option>
                    <option value="specialist">Spezialist - Experten-Wartungsaufgaben</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Bestimmt welche Wartungsaufgaben diesem Benutzer angezeigt werden
                  </p>
                </div>

                {/* Verfügbarkeit und Aktiv-Status */}
                <div className="space-y-3">
                  {!isOwnProfile && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                        Benutzer ist aktiv (kann sich anmelden)
                      </label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_available"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <label htmlFor="is_available" className="text-sm text-gray-700 dark:text-gray-300">
                      Verfügbar für Wartungsaufgaben
                    </label>
                  </div>
                  {!formData.is_available && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 ml-6">
                      ⚠️ Nicht verfügbare Benutzer (Urlaub/Krank) sehen keine neuen Wartungsaufgaben
                    </p>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormError('');
                      // Reset form data
                      setFormData({
                        username: userData.username || '',
                        email: userData.email || '',
                        first_name: userData.first_name || '',
                        last_name: userData.last_name || '',
                        is_active: userData.is_active,
                        skill_level: userData.skill_level || 'operator',
                        is_available: userData.is_available !== false,
                        role_ids: userData.roles?.map(r => r.id) || []
                      });
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Speichere...' : 'Speichern'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Benutzername</span>
                  <p className="text-gray-900 dark:text-white">{userData.username}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">E-Mail</span>
                  <p className="text-gray-900 dark:text-white">{userData.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Vorname</span>
                    <p className="text-gray-900 dark:text-white">{userData.first_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Nachname</span>
                    <p className="text-gray-900 dark:text-white">{userData.last_name || '-'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                  <p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      userData.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {userData.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Letzter Login</span>
                  <p className="text-gray-900 dark:text-white">
                    {userData.last_login 
                      ? new Date(userData.last_login).toLocaleString('de-DE')
                      : 'Nie'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Erstellt am</span>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(userData.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Permissions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Berechtigungen
            </h2>
            
            {userData.permissions && userData.permissions.length > 0 ? (
              <div className="space-y-4">
                {/* Group permissions by category */}
                {Object.entries(
                  userData.permissions.reduce((acc, perm) => {
                    const category = perm.category || 'other';
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(perm);
                    return acc;
                  }, {})
                ).map(([category, perms]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {perms.map(perm => (
                        <span 
                          key={perm.id}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          title={perm.description}
                        >
                          {perm.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Keine Berechtigungen zugewiesen
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Activity Tab */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Aktivitäts-Log
            </h2>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Lade Aktivitäten...
              </div>
            ) : userActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Keine Aktivitäten gefunden
              </div>
            ) : (
              <div className="space-y-3">
                {userActivity.map(activity => {
                  // Helper: Entity-Type Labels auf Deutsch
                  const getEntityLabel = (type) => {
                    const labels = {
                      'parts': 'Bauteil',
                      'operations': 'Operation',
                      'programs': 'NC-Programm',
                      'machines': 'Maschine',
                      'users': 'Benutzer',
                      'roles': 'Rolle',
                      'tools': 'Werkzeug',
                      'tool-master': 'Werkzeug',
                      'suppliers': 'Lieferant',
                      'purchase-orders': 'Bestellung',
                      'storage': 'Lagerort',
                      'measuring-equipment': 'Messmittel',
                      'clamping-devices': 'Spannmittel',
                      'fixtures': 'Vorrichtung',
                      'setup-sheets': 'Einrichteblatt',
                      'tool-number-lists': 'T-Nummern Liste',
                      'inspection-plans': 'Prüfplan'
                    };
                    return labels[type] || type;
                  };

                  // Helper: Link zur Entity generieren
                  const getEntityLink = (type, id) => {
                    if (!id || id === 0) return null;
                    const routes = {
                      'parts': `/parts/${id}`,
                      'operations': null, // Nested unter parts - braucht partId
                      'programs': null, // Nested unter operations
                      'machines': `/machines`,
                      'users': `/admin/users/${id}`,
                      'roles': `/admin/roles`,
                      'tools': `/tools/${id}`,
                      'tool-master': `/tools/${id}`,
                      'suppliers': `/suppliers/${id}`,
                      'purchase-orders': `/purchase-orders/${id}`,
                      'storage': `/storage/${id}`,
                      'measuring-equipment': `/measuring-equipment/${id}`,
                      'clamping-devices': `/clamping-devices/${id}`,
                      'fixtures': `/fixtures/${id}`,
                      'tool-number-lists': `/tool-number-lists/${id}`
                    };
                    return routes[type] || null;
                  };

                  const entityLabel = getEntityLabel(activity.entity_type);
                  const entityLink = getEntityLink(activity.entity_type, activity.entity_id);

                  return (
                  <div 
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.action === 'CREATE' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      activity.action === 'UPDATE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      activity.action === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {activity.action === 'CREATE' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                      {activity.action === 'UPDATE' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                      {activity.action === 'DELETE' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{getActionLabel(activity.action)}</span>
                        {' '}
                        {entityLink && activity.action !== 'DELETE' ? (
                          <Link 
                            to={entityLink}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {entityLabel} #{activity.entity_id}
                          </Link>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            {entityLabel} #{activity.entity_id}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.created_at).toLocaleString('de-DE')}
                        {activity.ip_address && ` · ${activity.ip_address}`}
                      </p>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Passwort zurücksetzen
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Neues Passwort für <strong>{userData.username}</strong> festlegen:
            </p>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleResetPassword}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort (min. 6 Zeichen)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                minLength={6}
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setNewPassword('');
                    setFormError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? 'Setze zurück...' : 'Zurücksetzen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDetailPage;
