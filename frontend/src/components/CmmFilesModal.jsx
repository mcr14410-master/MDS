// frontend/src/components/CmmFilesModal.jsx
// Dateien der aktiven Version eines Messprogramms: anzeigen (PDF), einzeln oder als ZIP laden
import { useEffect, useState } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import { downloadFileViaApi } from '../utils/fileDownload';
import API_BASE_URL from '../config/api';
import PdfViewer from './common/PdfViewer';
import { toast } from './Toaster';
import { cmmZipName } from '../utils/cmmPrograms';
import ReleasedVersionNote from './ReleasedVersionNote';

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function CmmFilesModal({ program, onClose }) {
  const { fetchCmmFiles } = useProgramsStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    fetchCmmFiles(program.id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'Fehler beim Laden der Dateien'));
  }, [program.id, fetchCmmFiles]);

  const download = async (path, name) => {
    const result = await downloadFileViaApi(path, name);
    if (!result.success) toast.error(result.error);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dateien – {program.program_name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {program.program_number}{data ? ` · Version ${data.version}` : ''}
              {data && (data.excel_report ? ' · mit Excel-Protokoll' : ' · ohne Excel-Protokoll')}
              {data && <ReleasedVersionNote version={data.version} releasedVersion={data.released_version} className="ml-2" />}
            </p>
            {data && data.version !== data.released_version && (
              <p className="mt-2 inline-block px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Diese Version ist nicht freigegeben – für die Maschine die freigegebene Version verwenden
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Schließen"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!data && !error && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {data && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
              {data.files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{f.filename}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {f.role_label} · {formatFileSize(f.filesize)}
                      {f.target === 'template_dir' && ' · PC-DMIS-Vorlagenverzeichnis'}
                      {f.role === 'calibration' && ' · Unterordner Kalibrierung'}
                    </div>
                  </div>
                  {f.role === 'drawing' && (
                    <button type="button" onClick={() => setPdfFile(pdfFile?.id === f.id ? null : f)}
                      className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                      {pdfFile?.id === f.id ? 'Ausblenden' : 'Anzeigen'}
                    </button>
                  )}
                  <button type="button" title="Herunterladen"
                    onClick={() => download(`/api/programs/${program.id}/files/${f.id}/download`, f.filename)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {pdfFile && (
            <PdfViewer
              fileUrl={`${API_BASE_URL}/api/programs/${program.id}/files/${pdfFile.id}/view`}
              fileName={pdfFile.filename}
              className="h-64"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Schließen
          </button>
          {data && (
            <button type="button"
              onClick={() => download(`/api/programs/${program.id}/files/zip?version=${encodeURIComponent(data.version)}`, cmmZipName(program, data.version))}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Alle als ZIP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
