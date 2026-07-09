"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TaskWithRelations, CreateTaskInput, UpdateTaskInput } from "@/types";

/**
 * Hook for optimistic task mutations with React Query
 * Provides better UX by immediately updating the UI while the mutation is in flight
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { createTask } = await import("@/lib/actions/tasks");
      return createTask(input);
    },
    onMutate: async (newTask) => {
      // Cancel any outgoing queries
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(["tasks"]);

      // Optimistically add the new task
      if (previousTasks) {
        const optimisticTask: TaskWithRelations = {
          id: Date.now(), // Temporary ID
          user_id: null,
          name: newTask.name,
          description: newTask.description ?? null,
          notes: null,
          list_id: newTask.list_id ?? null,
          date: newTask.date ?? null,
          deadline: newTask.deadline ?? null,
          estimate: newTask.estimate ?? null,
          actual_time: newTask.actual_time ?? null,
          priority: newTask.priority ?? "none",
          recurring: newTask.recurring ?? "none",
          recurring_config: newTask.recurring_config ?? null,
          completed: false,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sort_order: (Math.max(...previousTasks.map((t) => t.sort_order)) ?? 0) + 1,
          archived: false,
          labels: [],
          subtasks: [],
          reminders: [],
          logs: [],
          comments: [],
          attachments: [],
          blockers: [],
          blocked_by: [],
          time_entries: [],
          recurring_exceptions: [],
        };

        queryClient.setQueryData<TaskWithRelations[]>(["tasks"], [...previousTasks, optimisticTask]);
        return { previousTasks, optimisticTask };
      }
      return undefined;
    },
    onError: (_err, _newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to create task");
    },
    onSuccess: (_data) => {
      toast.success("Task created successfully");
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateTaskInput }) => {
      const { updateTask } = await import("@/lib/actions/tasks");
      return updateTask(id, input);
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(["tasks"]);

      if (previousTasks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData<any>(["tasks"], previousTasks.map((t) => (t.id === id ? { ...t, ...input, updated_at: new Date().toISOString() } : t)));
      }

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to update task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const { deleteTask } = await import("@/lib/actions/tasks");
      return deleteTask(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(["tasks"]);

      if (previousTasks) {
        queryClient.setQueryData<TaskWithRelations[]>(
          ["tasks"],
          previousTasks.filter((t) => t.id !== id)
        );
      }

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const { updateTask } = await import("@/lib/actions/tasks");
      return updateTask(id, { completed });
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(["tasks"]);

      if (previousTasks) {
        queryClient.setQueryData<TaskWithRelations[]>(
          ["tasks"],
          previousTasks.map((t) =>
            t.id === id
              ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
              : t
          )
        );
      }

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to update task status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const { archiveTask } = await import("@/lib/actions/tasks");
      return archiveTask(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(["tasks"]);

      if (previousTasks) {
        queryClient.setQueryData<TaskWithRelations[]>(
          ["tasks"],
          previousTasks.map((t) =>
            t.id === id ? { ...t, archived: true } : t
          )
        );
      }

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to archive task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task archived");
    },
  });

  const unarchiveTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const { unarchiveTask } = await import("@/lib/actions/tasks");
      return unarchiveTask(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(["tasks"]);

      if (previousTasks) {
        queryClient.setQueryData<TaskWithRelations[]>(
          ["tasks"],
          previousTasks.map((t) =>
            t.id === id ? { ...t, archived: false } : t
          )
        );
      }

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Failed to unarchive task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task restored");
    },
  });

  return {
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    toggleComplete: toggleCompleteMutation.mutate,
    archiveTask: archiveTaskMutation.mutate,
    unarchiveTask: unarchiveTaskMutation.mutate,
    isLoading:
      createTaskMutation.isPending ||
      updateTaskMutation.isPending ||
      deleteTaskMutation.isPending ||
      toggleCompleteMutation.isPending ||
      archiveTaskMutation.isPending ||
      unarchiveTaskMutation.isPending,
  };
}