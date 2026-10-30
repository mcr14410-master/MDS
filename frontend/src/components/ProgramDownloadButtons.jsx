// frontend/src/components/ProgramDownloadButtons.jsx
// Download-Knöpfe einer Programmkarte: Hauptknopf = freigegebene Version, daneben „Entwurf x.y.z“,
// wenn ein neuerer Entwurf existiert (bewusst zum Bearbeiten, nicht für die Maschine).
import { toast } from './Toaster';
import { downloadProgramVersion, downloadVersions, mainDownloadTitle } from '../utils/programDownload';

export default function ProgramDownloadButtons({ program }) {
  const { main, mainIsReleased, draft } = downloadVersions(program);

  const download = async (version, isReleased) => {
    const result = await downloadProgramVersion(program, version);
    if (!result.success) toast.error(result.error);
    else if (!isReleased) toast.info(`Version ${version} ist nicht freigegeben`);
  };

  return (
    <>
      <button
        onClick={() => download(main, mainIsReleased)}
        disabled={!main}
        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-40"
        title={mainDownloadTitle(program)}
        aria-label={mainDownloadTitle(program)}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
      {draft && (
        <button
          onClick={() => download(draft, false)}
          className="px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors whitespace-nowrap"
          title={`Entwurf ${draft} herunterladen – nicht freigegeben, nur zum Bearbeiten`}
        >
          Entwurf {draft}
        </button>
      )}
    </>
  );
}
