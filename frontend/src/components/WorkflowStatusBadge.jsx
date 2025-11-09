// frontend/src/components/WorkflowStatusBadge.jsx
import { useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

export default function WorkflowStatusBadge({ 
  status, 
  showIcon = true, 
  size = 'md' 
}) {
  const { states, fetchStates, getStateInfo } = useWorkflowStore();

  // Fetch states on mount if not loaded
  useEffect(() => {
    if (states.length === 0) {
      fetchStates().catch(console.error);
    }
  }, [states.length, fetchStates]);

  // Get state info
  const stateInfo = getStateInfo(status);
  const displayName = stateInfo?.display_name || status || 'Unbekannt';
  const description = stateInfo?.description || '';

  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  // Icon size variants
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  // Status color mapping with dark mode support
  const getStatusClasses = (statusCode) => {
    switch (statusCode) {
      case 'draft':
        return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      
      case 'review':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      
      case 'released':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      
      case 'archived':
        return 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700';
      
      default:
        return 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  // Status icon mapping
  const getStatusIcon = (statusCode) => {
    switch (statusCode) {
      case 'draft':
        return (
          <svg className={iconSizeClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      
      case 'review':
        return (
          <svg className={iconSizeClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      
      case 'approved':
        return (
          <svg className={iconSizeClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      
      case 'released':
        return (
          <svg className={iconSizeClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      
      case 'rejected':
        return (
          <svg className={iconSizeClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      
      case 'archived':
        return (
          <svg className={iconSizeClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      
      default:
        return (
          <svg className={iconSizeClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${sizeClasses[size]}
        ${getStatusClasses(status)}
      `}
      title={description}
    >
      {showIcon && getStatusIcon(status)}
      <span>{displayName}</span>
    </span>
  );
}
