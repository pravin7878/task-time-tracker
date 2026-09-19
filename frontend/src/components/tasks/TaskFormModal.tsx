import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiX, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { Task, TaskFormData } from '../../types/task.types';
import { extractApiError } from '../../lib/api';
import { useTaskSuggestion } from '../../hooks/useTaskSuggestion';
import { TaskSuggestionData } from '../../types/ai.types';

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
  const [suggestion, setSuggestion] = useState<TaskSuggestionData | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const taskSuggestionMutation = useTaskSuggestion();

  const isEditMode = !!taskToEdit;

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
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
      setSuggestion(null);
      setAiError(null);
      taskSuggestionMutation.reset();
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

  const handleImproveWithGemini = async () => {
    setAiError(null);
    const titleVal = (getValues('title') || '').trim();
    const descVal = (getValues('description') || '').trim();

    if (!titleVal && !descVal) {
      setAiError('Please enter a task title or description first.');
      return;
    }

    let input = '';
    if (titleVal && descVal) {
      input = `Task title: ${titleVal}\nTask description: ${descVal}`;
    } else if (titleVal) {
      input = titleVal;
    } else {
      input = descVal;
    }

    if (input.length > 1000) {
      input = input.slice(0, 1000);
    }

    try {
      const result = await taskSuggestionMutation.mutateAsync(input);
      setSuggestion(result);
    } catch {
      setAiError(
        'AI improvement is currently unavailable. You can still create the task manually.'
      );
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestion) {
      setValue('title', suggestion.title, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue('description', suggestion.description, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setSuggestion(null);
    }
  };

  const handleIgnoreSuggestion = () => {
    setSuggestion(null);
  };

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

        {/* AI Error Alert */}
        {aiError && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2.5 text-xs text-amber-800 animate-in fade-in duration-150"
          >
            <div className="flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{aiError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAiError(null)}
              className="text-amber-500 hover:text-amber-700 p-0.5 rounded transition-colors"
              aria-label="Dismiss AI alert"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Gemini AI Suggestion Preview Card */}
        {suggestion && (
          <div
            role="region"
            aria-label="AI Task Suggestion"
            className="mt-4 p-4 rounded-xl bg-gradient-to-br from-violet-50/70 via-indigo-50/40 to-white border border-violet-200/90 shadow-xs animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-violet-100">
              <div className="flex items-center gap-1.5">
                <HiSparkles className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-bold text-violet-900 tracking-wide">
                  Gemini Suggestion
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700 rounded-md">
                  Preview
                </span>
              </div>
              <button
                type="button"
                onClick={handleIgnoreSuggestion}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Dismiss suggestion"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                  Suggested Title:
                </span>
                <p className="font-semibold text-slate-900 text-sm leading-snug">
                  {suggestion.title}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                  Suggested Description:
                </span>
                <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                  {suggestion.description}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-violet-100/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleIgnoreSuggestion}
                className="px-3 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
              >
                Ignore
              </button>
              <button
                type="button"
                onClick={handleAcceptSuggestion}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 cursor-pointer"
              >
                <FiCheck className="w-3.5 h-3.5" />
                <span>Accept Suggestion</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-4 space-y-4">
          {/* Title Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="task-title"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Task Title <span className="text-rose-500">*</span>
              </label>

              {/* Improve with Gemini Button */}
              <button
                type="button"
                onClick={handleImproveWithGemini}
                disabled={isSubmitting || taskSuggestionMutation.isPending}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 text-violet-700 border border-violet-200/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                title="Improve title and description with Gemini AI"
              >
                {taskSuggestionMutation.isPending ? (
                  <>
                    <span className="w-3 h-3 border-2 border-violet-400 border-t-violet-700 rounded-full animate-spin" />
                    <span>Improving...</span>
                  </>
                ) : (
                  <>
                    <HiSparkles className="w-3.5 h-3.5 text-violet-600" />
                    <span>Improve with Gemini</span>
                  </>
                )}
              </button>
            </div>
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
