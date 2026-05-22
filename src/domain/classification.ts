import type { GoogleTask } from "./googleTasks";
import { createTaskMetadata, type TaskMatrixMetadata } from "./metadataStore";

export type QuadrantId =
  | "urgent-important"
  | "not-urgent-important"
  | "urgent-not-important"
  | "not-urgent-not-important";

export type ClassifiedTask = {
  task: GoogleTask;
  taskListId: string;
  important: boolean;
  urgent: boolean;
  quadrantId: QuadrantId;
  metadata?: TaskMatrixMetadata;
};

export const QUADRANTS: Array<{
  id: QuadrantId;
  title: string;
  subtitle: string;
  important: boolean;
  urgent: boolean;
}> = [
  {
    id: "not-urgent-important",
    title: "Schedule",
    subtitle: "Important, not urgent",
    important: true,
    urgent: false
  },
  {
    id: "urgent-important",
    title: "Do",
    subtitle: "Urgent + important",
    important: true,
    urgent: true
  },
  {
    id: "not-urgent-not-important",
    title: "Eliminate",
    subtitle: "Not urgent + not important",
    important: false,
    urgent: false
  },
  {
    id: "urgent-not-important",
    title: "Delegate",
    subtitle: "Urgent, not important",
    important: false,
    urgent: true
  }
];

export type Quadrant = (typeof QUADRANTS)[number];

export function isTaskDueTodayOrOverdue(due?: string, now = new Date()): boolean {
  if (!due) {
    return false;
  }

  const dueDate = due.slice(0, 10);
  const today = toLocalDateKey(now);
  return dueDate <= today;
}

export function toQuadrantId(important: boolean, urgent: boolean): QuadrantId {
  if (important && urgent) {
    return "urgent-important";
  }
  if (important && !urgent) {
    return "not-urgent-important";
  }
  if (!important && urgent) {
    return "urgent-not-important";
  }
  return "not-urgent-not-important";
}

export function quadrantToFlags(quadrantId: QuadrantId): { important: boolean; urgent: boolean } {
  const quadrant = QUADRANTS.find((item) => item.id === quadrantId);
  if (!quadrant) {
    throw new Error(`Unknown quadrant: ${quadrantId}`);
  }

  return {
    important: quadrant.important,
    urgent: quadrant.urgent
  };
}

export function classifyTasks(input: {
  tasks: GoogleTask[];
  taskListId: string;
  metadataByTaskId: Record<string, TaskMatrixMetadata>;
  now?: Date;
}): ClassifiedTask[] {
  return input.tasks.map((task) => {
    const metadata = input.metadataByTaskId[task.id];
    const important = metadata?.important ?? false;
    const urgent = metadata?.urgentOverride ?? isTaskDueTodayOrOverdue(task.due, input.now);

    return {
      task,
      taskListId: input.taskListId,
      important,
      urgent,
      quadrantId: toQuadrantId(important, urgent),
      metadata
    };
  });
}

export function createMetadataForQuadrant(input: {
  taskId: string;
  taskListId: string;
  quadrantId: QuadrantId;
  updatedAt?: string;
}): TaskMatrixMetadata {
  const flags = quadrantToFlags(input.quadrantId);
  return createTaskMetadata({
    taskId: input.taskId,
    taskListId: input.taskListId,
    important: flags.important,
    urgentOverride: flags.urgent,
    source: "manual",
    updatedAt: input.updatedAt
  });
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
