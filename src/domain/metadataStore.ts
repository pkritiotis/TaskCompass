export const CURRENT_METADATA_SCHEMA_VERSION = 1;

export type MetadataSource = "manual" | "rule";

export type TaskMatrixMetadata = {
  schemaVersion: number;
  taskId: string;
  taskListId: string;
  important: boolean;
  urgentOverride?: boolean;
  source: MetadataSource;
  updatedAt: string;
};

export type MatrixMetadataStore = {
  getSelectedTaskList(): Promise<string | null>;
  setSelectedTaskList(taskListId: string): Promise<void>;
  getTaskMetadata(taskListId: string): Promise<Record<string, TaskMatrixMetadata>>;
  upsertTaskMetadata(metadata: TaskMatrixMetadata): Promise<void>;
  deleteTaskMetadata(taskListId: string, taskId: string): Promise<void>;
};

export function createTaskMetadata(input: {
  taskId: string;
  taskListId: string;
  important: boolean;
  urgentOverride?: boolean;
  source?: MetadataSource;
  updatedAt?: string;
}): TaskMatrixMetadata {
  return {
    schemaVersion: CURRENT_METADATA_SCHEMA_VERSION,
    taskId: input.taskId,
    taskListId: input.taskListId,
    important: input.important,
    urgentOverride: input.urgentOverride,
    source: input.source ?? "manual",
    updatedAt: input.updatedAt ?? new Date().toISOString()
  };
}
