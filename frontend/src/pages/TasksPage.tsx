import React, { useState, useMemo } from 'react';
import {
  FiPlus,
  FiFilter,
  FiAlertCircle,
  FiInbox,
  FiRefreshCw,
  FiList,
  FiGrid,
} from 'react-icons/fi';
import { Task, TaskFilterStatus, TaskFormData, TaskStatus } from '../types/task.types';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '../hooks/useTasks';
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useTimeLogs,
} from '../hooks/useTimeTracking';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskListItem } from '../components/tasks/TaskListItem';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { DeleteTaskModal } from '../components/tasks/DeleteTaskModal';
import { Toast, ToastMessage } from '../components/common/Toast';

export const TasksPage: React.FC = () => {
  // Filter state
  const [filter, setFilter] = useState<TaskFilterStatus>('all');

  // View mode state: 'list' (default per user preference) or 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('task_view_mode') as 'list' | 'grid') || 'list';
  });

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('task_view_mode', mode);
  };

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Auto-dismiss Toast state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (
    type: 'info' | 'warning' | 'error' | 'success',
    message: string
  ) => {
    setToast({
      id: String(Date.now()),
      type,
      message,
    });
  };

  // Queries & Mutations
  const { data: tasks = [], isLoading, isError, error, refetch } = useTasks(filter);
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Time tracking hooks
  const { data: activeTimer } = useActiveTimer();
  const { data: timeLogs = [] } = useTimeLogs();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();

  // Group completed session durations by taskId (avoids N+1 requests)
  const taskTotalTimeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of timeLogs) {
      if (typeof log.duration === 'number' && log.duration > 0) {
        map.set(log.taskId, (map.get(log.taskId) || 0) + log.duration);
      }
    }
    return map;
  }, [timeLogs]);

  // Filter counts across the user's tasks
  const { data: allTasks = [] } = useTasks('all');
  const counts = useMemo(() => {
    return {
      all: allTasks.length,
      pending: allTasks.filter((t) => t.status === 'pending').length,
      in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
    };
  }, [allTasks]);

  // Open modal for creating a new task
  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsFormModalOpen(true);
  };

  // Open modal for editing an existing task
  const handleOpenEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsFormModalOpen(true);
  };

  // Close form modal
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setTaskToEdit(null);
  };

  // Submit handler for create/edit
  const handleFormSubmit = async (formData: TaskFormData) => {
    if (taskToEdit) {
      await updateTaskMutation.mutateAsync({
        id: taskToEdit.id,
        data: {
          title: formData.title,
          description: formData.description,
          status: formData.status,
        },
      });
    } else {
      await createTaskMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        status: 'pending',
      });
    }
  };

  // Quick status change from TaskCard / TaskListItem dropdown
  const handleQuickStatusChange = async (task: Task, nextStatus: TaskStatus) => {
    if (nextStatus === task.status) return;

    const isRunning = activeTimer?.taskId === task.id;

    // Rule: When timer is running, user CANNOT change In Progress → Pending
    if (isRunning && nextStatus === 'pending') {
      showToast(
        'warning',
        'Cannot mark task as Pending while its timer is running. Stop the timer first.'
      );
      return;
    }

    // Rule: When timer is running, user CAN change In Progress → Completed
    // If user selects Completed while timer is running:
    // 1. Stop the timer first.
    // 2. Then change status to Completed.
    // Never leave the task as Completed + Running Timer.
    // If timer stops successfully but status update fails, keep timer stopped and show a recoverable error.
    if (isRunning && nextStatus === 'completed') {
      try {
        setStatusUpdatingId(task.id);

        // Step 1: Stop timer first
        try {
          await stopTimerMutation.mutateAsync(task.id);
        } catch (stopErr: unknown) {
          const msg = stopErr instanceof Error ? stopErr.message : 'Failed to stop timer';
          showToast('error', `Could not stop timer: ${msg}. Task was not marked as completed.`);
          return;
        }

        // Step 2: Then update status to Completed
        try {
          await updateTaskMutation.mutateAsync({
            id: task.id,
            data: { status: 'completed' },
          });
          showToast('success', `Timer stopped and task marked as Completed.`);
        } catch (statusErr: unknown) {
          const msg = statusErr instanceof Error ? statusErr.message : 'Failed to update status';
          showToast(
            'error',
            `Timer was stopped, but updating status to Completed failed (${msg}). Please set status to Completed manually.`
          );
        }
      } finally {
        setStatusUpdatingId(null);
      }
      return;
    }

    // Normal status change (when timer is not running on this task)
    try {
      setStatusUpdatingId(task.id);
      await updateTaskMutation.mutateAsync({
        id: task.id,
        data: { status: nextStatus },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update task status';
      showToast('error', msg);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Start timer handler
  const handleStartTimer = async (task: Task) => {
    try {
      const result = await startTimerMutation.mutateAsync({
        taskId: task.id,
        currentStatus: task.status,
      });

      if (result.statusUpdateFailed) {
        showToast(
          'warning',
          `Timer started for "${task.title}", but automatic status update failed. Timer is running; please update status manually.`
        );
      }
    } catch (err: unknown) {
      // Friendly handling of 409 conflict
      const errorObj = err as Record<string, unknown>;
      const responseObj = errorObj?.response as Record<string, unknown> | undefined;
      const isConflict =
        responseObj?.status === 409 ||
        errorObj?.statusCode === 409 ||
        (typeof errorObj?.message === 'string' &&
          (errorObj.message.includes('409') ||
            errorObj.message.toLowerCase().includes('already running') ||
            errorObj.message.toLowerCase().includes('conflict')));

      if (isConflict) {
        showToast(
          'warning',
          'Another timer is already running. Stop it before starting another task.'
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to start timer';
        showToast('error', msg);
      }
    }
  };

  // Stop timer handler
  const handleStopTimer = async (task: Task) => {
    try {
      await stopTimerMutation.mutateAsync(task.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to stop timer';
      showToast('error', msg);
    }
  };

  // Delete confirmation handler
  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      await deleteTaskMutation.mutateAsync(taskToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your tasks, track progress, and organize your work.
          </p>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-xs"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs / Pills & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none w-fit max-w-full">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'completed', label: 'Completed' },
            ] as const
          ).map((tab) => {
            const isActive = filter === tab.id;
            const count = counts[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 font-bold'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: View Mode Toggle (List vs Grid) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => handleViewModeChange('list')}
            aria-label="List view"
            title="List view"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              viewMode === 'list'
                ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FiList className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('grid')}
            aria-label="Grid view"
            title="Grid view"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              viewMode === 'grid'
                ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FiGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        viewMode === 'list' ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="w-1/3 h-4 bg-slate-200 rounded" />
                  <div className="w-2/3 h-3 bg-slate-100 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-6 bg-slate-200 rounded-full" />
                  <div className="w-16 h-6 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-20 h-5 bg-slate-200 rounded-full" />
                  <div className="w-12 h-5 bg-slate-200 rounded-md" />
                </div>
                <div className="w-3/4 h-5 bg-slate-200 rounded" />
                <div className="space-y-2">
                  <div className="w-full h-3 bg-slate-100 rounded" />
                  <div className="w-5/6 h-3 bg-slate-100 rounded" />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="w-24 h-3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div
          role="alert"
          className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs text-center max-w-md mx-auto"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Unable to load tasks
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {error?.message || 'A network error occurred while fetching your tasks.'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && tasks.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FiInbox className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            {filter === 'all'
              ? 'No tasks yet'
              : `No ${filter.replace('_', ' ')} tasks found`}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {filter === 'all'
              ? 'Get started by creating your first task to track your work and productivity.'
              : `You do not have any tasks currently marked as ${filter.replace('_', ' ')}.`}
          </p>
          {filter === 'all' ? (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-xs"
            >
              <FiPlus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          ) : (
            <button
              onClick={() => setFilter('all')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
            >
              <FiFilter className="w-4 h-4" />
              <span>View All Tasks</span>
            </button>
          )}
        </div>
      )}

      {/* Task List / Grid Display */}
      {!isLoading && !isError && tasks.length > 0 && (
        viewMode === 'list' ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                activeTimer={activeTimer}
                totalTrackedSeconds={taskTotalTimeMap.get(task.id) || 0}
                onEdit={handleOpenEditModal}
                onDelete={(t) => setTaskToDelete(t)}
                onStatusChange={handleQuickStatusChange}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                isUpdatingStatus={statusUpdatingId === task.id}
                isStartingTimer={
                  startTimerMutation.isPending &&
                  startTimerMutation.variables?.taskId === task.id
                }
                isStoppingTimer={
                  stopTimerMutation.isPending &&
                  stopTimerMutation.variables === task.id
                }
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                activeTimer={activeTimer}
                totalTrackedSeconds={taskTotalTimeMap.get(task.id) || 0}
                onEdit={handleOpenEditModal}
                onDelete={(t) => setTaskToDelete(t)}
                onStatusChange={handleQuickStatusChange}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                isUpdatingStatus={statusUpdatingId === task.id}
                isStartingTimer={
                  startTimerMutation.isPending &&
                  startTimerMutation.variables?.taskId === task.id
                }
                isStoppingTimer={
                  stopTimerMutation.isPending &&
                  stopTimerMutation.variables === task.id
                }
              />
            ))}
          </div>
        )
      )}

      {/* Create / Edit Modal Dialog */}
      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        taskToEdit={taskToEdit}
        onSubmit={handleFormSubmit}
        isSubmitting={
          createTaskMutation.isPending || updateTaskMutation.isPending
        }
      />

      {/* Delete Confirmation Dialog */}
      <DeleteTaskModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        task={taskToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteTaskMutation.isPending}
      />

      {/* Small Auto-Dismiss Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default TasksPage;
