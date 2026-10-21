import { useState, useEffect } from 'react';
import axios from '../utils/axios';

// Hinweis „Neue Version verfügbar“: vergleicht die eigene Version (Build) mit der des Backends.
// Offene Tabs und die Web-App zeigen nach einem Deploy sonst bis zum Neuladen die alte Version.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 10 * 1000; // Fokus + Sichtbarkeit feuern beim Tabwechsel oft beide

export default function UpdateBanner() {
  const [newVersion, setNewVersion] = useState(null);
  const [dismissed, setDismissed] = useState(null);

  useEffect(() => {
    const currentVersion = import.meta.env.VITE_APP_VERSION;
    let lastCheck = 0;
    let active = true;

    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastCheck < MIN_GAP_MS) return;
      lastCheck = now;
      try {
        const res = await axios.get('/api/health');
        const version = res.data?.version;
        if (active && version && version !== currentVersion) setNewVersion(version);
      } catch {
        // Backend kurz nicht erreichbar (z. B. während des Deploys) – nächster Versuch reicht
      }
    };

    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!newVersion || newVersion === dismissed) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-sm
                    bg-blue-600 text-white dark:bg-blue-700">
      <span>
        Neue MDS-Version {newVersion} verfügbar. Ungespeicherte Eingaben vorher speichern.
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="px-2.5 py-0.5 rounded bg-white text-blue-700 font-medium hover:bg-blue-50"
        >
          Neu laden
        </button>
        <button
          onClick={() => setDismissed(newVersion)}
          className="px-1.5 py-0.5 rounded text-blue-100 hover:bg-blue-500 dark:hover:bg-blue-600"
          title="Ausblenden"
          aria-label="Hinweis ausblenden"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
