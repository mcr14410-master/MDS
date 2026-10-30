// frontend/src/components/CmmProgramsList.jsx
// Messprogramme (KMG / PC-DMIS) am Arbeitsgang – eigener Reiter neben den NC-Programmen.
// Gleiche Daten wie NC (Tabelle programs, kind = 'cmm'), daher gleicher Store und Workflow.
import { useEffect, useState } from 'react';
import { useProgramsStore, EMPTY_PROGRAMS } from '../stores/programsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import CmmProgramCard from './CmmProgramCard';
import CmmUploadForm from './CmmUploadForm';
import ProgramUploadForm from './ProgramUploadForm';
import RevisionsList from './RevisionsList';
import ProgramStatusFilter from './ProgramStatusFilter';
import DeployDialog from './DeployDialog';
import DeploymentsPanel from './DeploymentsPanel';

export default function CmmProgramsList({ operationId }) {
  const { programsByOperation, loadingByOperation, errorByOperation, fetchPrograms, deleteProgram } = useProgramsStore();
  const allPrograms = programsByOperation[operationId] || EMPTY_PROGRAMS;
  const programs = allPrograms.filter((p) => p?.kind === 'cmm');
  const loading = loadingByOperation[operationId];
  const error = errorByOperation[operationId];
  const { hasPermission } = useAuthStore();
  // { program: null } = neues Messprogramm, { program } = neue Version
  const [upload, setUpload] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);
  const [revisionsProgram, setRevisionsProgram] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deploying, setDeploying] = useState(false);
  const [deploymentsKey, setDeploymentsKey] = useState(0);

  useEffect(() => {
    if (operationId) {
      fetchPrograms(operationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationId]);

  const reload = () => fetchPrograms(operationId);

  const handleDelete = async (program) => {
    if (!window.confirm(`Messprogramm "${program.program_name}" mit allen Dateien und Versionen wirklich löschen?`)) {
      return;
    }
    try {
      await deleteProgram(program.id);
      toast.success('Messprogramm gelöscht');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  if (loading && allPrograms.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Messprogramme...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  const uploadButton = (label) => (
    <button
      onClick={() => setUpload({ program: null })}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      {label}
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Messprogramme</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {programs.length} {programs.length === 1 ? 'Messprogramm' : 'Messprogramme'} · PC-DMIS
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('program.deploy') && programs.length > 0 && (
            <button
              onClick={() => setDeploying(true)}
              className="px-4 py-2 rounded-lg border border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Auf Gerät bereitstellen
            </button>
          )}
          {hasPermission('part.update') && uploadButton('Messprogramm hochladen')}
        </div>
      </div>

      <div className="mb-6">
        <DeploymentsPanel operationId={operationId} reloadKey={deploymentsKey} />
      </div>

      <ProgramStatusFilter value={statusFilter} onChange={setStatusFilter} />

      {programs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-5xl mb-4">📐</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Noch keine Messprogramme
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Den PC-DMIS-Ordner des Programms hochladen – .prg, .cad, Prüfzeichnung; Excel-Vorlage und Kalibrierprogramm im eigenen Bereich.
          </p>
          {hasPermission('part.update') && uploadButton('Erstes Messprogramm hochladen')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs
            .filter((program) => statusFilter === 'all' || program.workflow_state === statusFilter)
            .map((program) => (
              <CmmProgramCard
                key={program.id}
                program={program}
                onEdit={setEditingProgram}
                onDelete={handleDelete}
                onViewVersions={setRevisionsProgram}
                onNewRevision={(p) => setUpload({ program: p })}
                onStatusChange={reload}
              />
            ))}
        </div>
      )}

      {upload && (
        <CmmUploadForm
          operationId={operationId}
          program={upload.program}
          onClose={() => setUpload(null)}
          onSuccess={() => {
            setUpload(null);
            reload();
          }}
        />
      )}

      {/* Name/Beschreibung bearbeiten – gleiches Formular wie NC (ohne Datei) */}
      {editingProgram && (
        <ProgramUploadForm
          operationId={operationId}
          program={editingProgram}
          isNewRevision={false}
          onClose={() => setEditingProgram(null)}
          onSuccess={() => {
            setEditingProgram(null);
            reload();
          }}
        />
      )}

      {deploying && (
        <DeployDialog
          operationId={operationId}
          programs={programs}
          onClose={() => setDeploying(false)}
          onSuccess={() => {
            setDeploying(false);
            setDeploymentsKey((k) => k + 1);
          }}
        />
      )}

      {revisionsProgram && (
        <RevisionsList
          program={revisionsProgram}
          onClose={() => {
            setRevisionsProgram(null);
            reload(); // nach Rollback
          }}
        />
      )}
    </div>
  );
}
