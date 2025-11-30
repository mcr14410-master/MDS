import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUsersStore } from '../stores/usersStore';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';
import Breadcrumbs from '../components/Breadcrumbs';

function ProfilePage() {
  const { user, verifyToken } = useAuthStore();
  const { updateProfile } = useUsersStore();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await updateProfile(profileData);
    
    if (result.success) {
      setIsEditingProfile(false);
      setSuccess('Profil erfolgreich aktualisiert');
      // Update auth store with new user data
      await verifyToken();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Neue Passwörter stimmen nicht überein');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Neues Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      await axios.post(API_ENDPOINTS.CHANGE_PASSWORD, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Passwort erfolgreich geändert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler beim Ändern des Passworts');
    }

    setLoading(false);
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

  if (!user) return null;

  const breadcrumbItems = [
    { label: 'Profil' }
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
          {user.full_name && (
            <p className="text-gray-600 dark:text-gray-400">{user.full_name}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {user.roles?.map(role => (
              <span 
                key={role}
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(role)}`}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profil-Informationen
            </h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Bearbeiten
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
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
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileData({
                      first_name: user.first_name || '',
                      last_name: user.last_name || '',
                      email: user.email || ''
                    });
                    setError('');
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
                <p className="text-gray-900 dark:text-white">{user.username}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">E-Mail</span>
                <p className="text-gray-900 dark:text-white">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Vorname</span>
                  <p className="text-gray-900 dark:text-white">{user.first_name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nachname</span>
                  <p className="text-gray-900 dark:text-white">{user.last_name || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Passwort ändern
            </h2>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Ändern
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Aktuelles Passwort
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Neues Passwort
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Neues Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setError('');
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
                  {loading ? 'Ändere...' : 'Passwort ändern'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Klicken Sie auf "Ändern", um Ihr Passwort zu aktualisieren.
            </p>
          )}
        </div>

        {/* Permissions Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ihre Berechtigungen
          </h2>
          
          {user.permissions && user.permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.permissions.map(perm => (
                <span 
                  key={perm}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {perm}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Keine Berechtigungen zugewiesen
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
