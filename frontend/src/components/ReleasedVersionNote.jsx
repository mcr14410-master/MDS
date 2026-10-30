// frontend/src/components/ReleasedVersionNote.jsx
// Hinweis „freigegeben: x.y.z“, wenn eine neuere Version in Arbeit ist als die freigegebene
export default function ReleasedVersionNote({ version, releasedVersion, className = '' }) {
  if (!releasedVersion || releasedVersion === version) return null;
  return (
    <span
      className={`text-xs font-medium text-emerald-700 dark:text-emerald-400 ${className}`}
      title="Diese Version ist freigegeben und darf an die Maschine"
    >
      freigegeben: {releasedVersion}
    </span>
  );
}
