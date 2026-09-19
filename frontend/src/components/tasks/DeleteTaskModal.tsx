import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { Task } from '../../types/task.types';
import { extractApiError } from '../../lib/api';

interface DeleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteTaskModal: React.FC<DeleteTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onConfirm,
  isDeleting,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !task) return null;

  const handleDelete = async () => {
    try {
      setErrorMessage(null);
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const extracted = extractApiError(
        err,
        'Failed to delete task. Please try again.'
      );
      // Backend 409 Conflict message is preserved and displayed authoritatively:
      // "Cannot delete a task while its timer is running."
      setErrorMessage(extracted.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-task-modal-title"
      aria-describedby="delete-task-modal-desc"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <h2
            id="delete-task-modal-title"
            className="text-lg font-bold text-slate-900"
          >
            Delete Task
          </h2>
          <p
            id="delete-task-modal-desc"
            className="mt-2 text-sm text-slate-600 leading-relaxed"
          >
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">"{task.title}"</span>?
            This action cannot be undone.
          </p>
        </div>

        {/* Error / Conflict Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed"
          >
            <div className="font-semibold mb-0.5">Unable to delete task</div>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Task</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTaskModal;
