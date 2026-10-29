// frontend/src/components/ProgramsList.jsx
// NC-Programme am Arbeitsgang (Messprogramme: CmmProgramsList, eigener Reiter)
import { useEffect, useState } from 'react';
import { useProgramsStore, EMPTY_PROGRAMS } from '../stores/programsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import ProgramCard from './ProgramCard';
import ProgramUploadForm from './ProgramUploadForm';
import RevisionsList from './RevisionsList'; // NEU: Woche 7
import ProgramStatusFilter from './ProgramStatusFilter';

export default function ProgramsList({ operationId }) {
  const { programsByOperation, loadingByOperation, errorByOperation, fetchPrograms, deleteProgram } = useProgramsStore();
  const allPrograms = programsByOperation[operationId] || EMPTY_PROGRAMS;
  const programs = allPrograms.filter((p) => p && p.kind !== 'cmm');
  const cmmCount = allPrograms.filter((p) => p?.kind === 'cmm').length;
  const loading = loadingByOperation[operationId];
  const error = errorByOperation[operationId];
  const { hasPermission } = useAuthStore();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [isNewRevision, setIsNewRevision] = useState(false);         // NEU: Woche 7
  const [showRevisions, setShowRevisions] = useState(false);         // NEU: Woche 7
  const [selectedProgram, setSelectedProgram] = useState(null);      // NEU: Woche 7
  const [statusFilter, setStatusFilter] = useState('all');           // NEU: Woche 9

  useEffect(() => {
    if (operationId) {
      fetchPrograms(operationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationId]);

  const handleEdit = (program) => {
    setEditingProgram(program);
    setIsNewRevision(false);
    setShowUploadForm(true);
  };

  // NEU: Woche 7 - Neue Version hochladen
  const handleNewRevision = (program) => {
    setEditingProgram(program);
    setIsNewRevision(true);
    setShowUploadForm(true);
  };

  const handleDelete = async (program) => {
    if (!window.confirm(`Programm "${program.program_name}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteProgram(program.id);
      toast.success('Programm erfolgreich gelöscht');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  const handleFormClose = () => {
    setShowUploadForm(false);
    setEditingProgram(null);
    setIsNewRevision(false);
  };

  const handleFormSuccess = () => {
    fetchPrograms(operationId);
    handleFormClose();
  };

  // NEU: Woche 7 - Versionen anzeigen
  const handleViewVersions = (program) => {
    setSelectedProgram(program);
    setShowRevisions(true);
  };

  const handleRevisionsClose = () => {
    setShowRevisions(false);
    setSelectedProgram(null);
    // Refresh programs nach Rollback
    fetchPrograms(operationId);
  };

  // NEU: Woche 9 - Status-Änderung
  const handleStatusChange = (programId, newState) => {
    // Programme neu laden nach Status-Änderung
    fetchPrograms(operationId);
  };

  if (loading && allPrograms.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Programme...</p>
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">NC-Programme</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {programs.length} {programs.length === 1 ? 'Programm' : 'Programme'}
          </p>
        </div>
        
        {hasPermission('part.update') && (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => setShowUploadForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Programm hochladen
            </button>
          </div>
        )}
      </div>

      {cmmCount > 0 && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {cmmCount === 1 ? 'Ein Messprogramm' : `${cmmCount} Messprogramme`} an diesem Arbeitsgang
          {cmmCount === 1 ? ' steht' : ' stehen'} im Reiter „Messprogramme“ – fehlt er, unter „Arbeitsgang bearbeiten“ bei „Aktivierte Bereiche“ einschalten.
        </p>
      )}

      <ProgramStatusFilter value={statusFilter} onChange={setStatusFilter} />

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Noch keine NC-Programme
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Laden Sie das erste NC-Programm für diesen Arbeitsgang hoch.
          </p>
          {hasPermission('part.update') && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Erstes Programm hochladen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs
            .filter(program => program.id) // Nur gültige Programme
            .filter(program => statusFilter === 'all' || program.workflow_state === statusFilter) // NEU: Status-Filter
            .map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewVersions={handleViewVersions}
                onNewRevision={handleNewRevision}
                onStatusChange={handleStatusChange}
              />
            ))}
        </div>
      )}

      {/* Upload Form Modal */}
      {showUploadForm && (
        <ProgramUploadForm
          operationId={operationId}
          program={editingProgram}
          isNewRevision={isNewRevision}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Revisions List Modal (NEU: Woche 7) */}
      {showRevisions && selectedProgram && (
        <RevisionsList
          program={selectedProgram}
          onClose={handleRevisionsClose}
        />
      )}
    </div>
  );
}
