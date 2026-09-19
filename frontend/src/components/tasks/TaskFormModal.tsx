import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import { Task, TaskFormData } from '../../types/task.types';
import { extractApiError } from '../../lib/api';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSubmit: (data: TaskFormData) => Promise<void>;
  isSubmitting: boolean;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  onSubmit,
  isSubmitting,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const isEditMode = !!taskToEdit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
    },
  });

  // Populate form when editing an existing task, or reset when opening fresh
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (taskToEdit) {
        reset({
          title: taskToEdit.title,
          description: taskToEdit.description || '',
          status: taskToEdit.status,
        });
      } else {
        reset({
          title: '',
          description: '',
          status: 'pending',
        });
      }
    }
  }, [isOpen, taskToEdit, reset]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: TaskFormData) => {
    try {
      setServerError(null);
      await onSubmit({
        ...data,
        status: isEditMode ? data.status : 'pending',
      });
      onClose();
    } catch (err: unknown) {
      const extracted = extractApiError(err, 'Failed to save task.');
      setServerError(extracted.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-form-modal-title"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2
            id="task-form-modal-title"
            className="text-lg font-bold text-slate-900"
          >
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700"
          >
            <FiAlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-4 space-y-4">
          {/* Title Field */}
          <div>
            <label
              htmlFor="task-title"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              autoFocus
              placeholder="e.g. Implement authentication tests"
              {...register('title', {
                required: 'Title is required',
                minLength: {
                  value: 1,
                  message: 'Title must be at least 1 character',
                },
                maxLength: {
                  value: 200,
                  message: 'Title cannot exceed 200 characters',
                },
                validate: (value) =>
                  value.trim().length > 0 || 'Title cannot be only whitespace',
              })}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:cursor-not-allowed ${
                errors.title ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="task-description"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Description <span className="text-slate-400 text-xs normal-case font-normal">(Optional)</span>
            </label>
            <textarea
              id="task-description"
              rows={3}
              placeholder="Add additional context or notes about this task..."
              {...register('description', {
                maxLength: {
                  value: 2000,
                  message: 'Description cannot exceed 2000 characters',
                },
              })}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none disabled:bg-slate-50 disabled:cursor-not-allowed ${
                errors.description ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>
            )}
          </div>

          {/* Status Field (Edit Mode Only - New tasks always default to Pending) */}
          {isEditMode && (
            <div>
              <label
                htmlFor="task-status"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Status
              </label>
              <select
                id="task-status"
                {...register('status')}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="pending" className="bg-white text-slate-800">Pending</option>
                <option value="in_progress" className="bg-white text-slate-800">In Progress</option>
                <option value="completed" className="bg-white text-slate-800">Completed</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Task'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
