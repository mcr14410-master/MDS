import { useState, useEffect } from 'react';
import { useRolesStore } from '../../stores/rolesStore';
import { useAuthStore } from '../../stores/authStore';
import Breadcrumbs from '../../components/Breadcrumbs';

function RolesPage() {
  const { 
    roles, 
    permissions,
    permissionsGrouped,
    permissionMatrix,
    loading, 
    error, 
    fetchRoles,
    fetchPermissions,
    fetchPermissionMatrix,
    createRole,
    updateRole,
    deleteRole
  } = useRolesStore();
  
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');
  
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'matrix'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: []
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (activeTab === 'matrix') {
      fetchPermissionMatrix();
    }
  }, [activeTab]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name) {
      setFormError('Rollenname ist erforderlich');
      return;
    }
    
    const result = await createRole(formData);
    if (result.success) {
      setShowCreateModal(false);
      setFormData({ name: '', description: '', permission_ids: [] });
    } else {
      setFormError(result.error);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    setFormError('');
    
    const result = await updateRole(showEditModal.id, formData);
    if (result.success) {
      setShowEditModal(null);
      setFormData({ name: '', description: '', permission_ids: [] });
    } else {
      setFormError(result.error);
    }
  };

  const handleDeleteRole = async (id) => {
    const result = await deleteRole(id);
    if (result.success) {
      setShowDeleteModal(null);
    }
  };

  const openEditModal = (role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
      permission_ids: role.permissions?.map(p => p.id) || []
    });
    setShowEditModal(role);
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

  const systemRoles = ['admin', 'programmer', 'reviewer', 'operator', 'helper', 'supervisor'];

  const breadcrumbItems = [
    { label: 'Administration', path: '/admin' },
    { label: 'Rollen & Berechtigungen' }
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rollen & Berechtigungen</h1>
          <p className="text-gray-600 dark:text-gray-400">{roles.length} Rollen, {permissions.length} Berechtigungen</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setFormData({ name: '', description: '', permission_ids: [] });
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neue Rolle
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Rollen
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'matrix'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Berechtigungs-Matrix
          </button>
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Lade Rollen...
            </div>
          ) : roles.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Keine Rollen gefunden
            </div>
          ) : (
            roles.map(role => (
              <div 
                key={role.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className={`px-2 py-1 text-sm font-medium rounded-full ${getRoleBadgeColor(role.name)}`}>
                      {role.name}
                    </span>
                    {systemRoles.includes(role.name) && (
                      <span className="ml-2 text-xs text-gray-400">System</span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(role)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {!systemRoles.includes(role.name) && (
                        <button
                          onClick={() => setShowDeleteModal(role)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Löschen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {role.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {role.description}
                  </p>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {role.user_count || 0} Benutzer · {role.permissions?.length || 0} Berechtigungen
                </div>
                
                {role.permissions && role.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 5).map(perm => (
                      <span 
                        key={perm.id}
                        className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {perm.name}
                      </span>
                    ))}
                    {role.permissions.length > 5 && (
                      <span className="px-1.5 py-0.5 text-xs text-gray-400">
                        +{role.permissions.length - 5} mehr
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Lade Matrix...
            </div>
          ) : !permissionMatrix ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Keine Daten verfügbar
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase sticky left-0 bg-gray-50 dark:bg-gray-900/50 z-10">
                      Berechtigung
                    </th>
                    {permissionMatrix.roles.map(role => (
                      <th 
                        key={role.id}
                        className="px-4 py-3 text-center text-xs font-medium uppercase"
                      >
                        <span className={`px-2 py-1 rounded-full ${getRoleBadgeColor(role.name)}`}>
                          {role.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(permissionMatrix.categories).map(([category, perms]) => (
                    <>
                      <tr key={`cat-${category}`} className="bg-gray-100 dark:bg-gray-900/30">
                        <td 
                          colSpan={permissionMatrix.roles.length + 1}
                          className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                        >
                          {category}
                        </td>
                      </tr>
                      {perms.map(perm => (
                        <tr key={perm.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800">
                            <div>
                              <span className="font-medium">{perm.name}</span>
                              {perm.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{perm.description}</p>
                              )}
                            </div>
                          </td>
                          {permissionMatrix.roles.map(role => (
                            <td key={`${role.id}-${perm.id}`} className="px-4 py-2 text-center">
                              {permissionMatrix.matrix[role.id]?.permissions[perm.id] ? (
                                <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Role Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {showEditModal ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
              </h2>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              
              <form onSubmit={showEditModal ? handleUpdateRole : handleCreateRole} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rollenname *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    disabled={showEditModal && systemRoles.includes(showEditModal.name)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Berechtigungen
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-64 overflow-y-auto">
                    {Object.entries(permissionsGrouped).map(([category, perms]) => (
                      <div key={category} className="mb-4 last:mb-0">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          {category}
                        </h4>
                        <div className="space-y-1">
                          {perms.map(perm => (
                            <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.permission_ids.includes(perm.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, permission_ids: [...formData.permission_ids, perm.id] });
                                  } else {
                                    setFormData({ ...formData, permission_ids: formData.permission_ids.filter(id => id !== perm.id) });
                                  }
                                }}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {perm.name}
                              </span>
                              {perm.description && (
                                <span className="text-xs text-gray-400">- {perm.description}</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(null);
                      setFormError('');
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
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Rolle löschen?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Möchten Sie die Rolle <strong>{showDeleteModal.name}</strong> wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteRole(showDeleteModal.id)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Lösche...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RolesPage;
