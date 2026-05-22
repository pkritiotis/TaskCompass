import {
  CURRENT_METADATA_SCHEMA_VERSION,
  type MatrixMetadataStore,
  type TaskMatrixMetadata
} from "../domain/metadataStore";

const SELECTED_LIST_KEY = "selectedTaskListId";
const METADATA_PREFIX = "taskMetadata:";

type ChromeStorageArea = {
  get(keys: string | string[], callback: (items: Record<string, unknown>) => void): void;
  set(items: Record<string, unknown>, callback: () => void): void;
};

export class ChromeSyncMetadataStore implements MatrixMetadataStore {
  constructor(private readonly storage: ChromeStorageArea = chrome.storage.sync) {}

  async getSelectedTaskList(): Promise<string | null> {
    const data = await this.getRecord(SELECTED_LIST_KEY);
    return typeof data[SELECTED_LIST_KEY] === "string" ? data[SELECTED_LIST_KEY] : null;
  }

  async setSelectedTaskList(taskListId: string): Promise<void> {
    await this.setRecord({ [SELECTED_LIST_KEY]: taskListId });
  }

  async getTaskMetadata(taskListId: string): Promise<Record<string, TaskMatrixMetadata>> {
    const key = metadataKey(taskListId);
    const data = await this.getRecord(key);
    const records = data[key];

    if (!isMetadataRecord(records)) {
      return {};
    }

    return records;
  }

  async upsertTaskMetadata(metadata: TaskMatrixMetadata): Promise<void> {
    const normalized = normalizeMetadata(metadata);
    const records = await this.getTaskMetadata(normalized.taskListId);

    await this.setRecord({
      [metadataKey(normalized.taskListId)]: {
        ...records,
        [normalized.taskId]: normalized
      }
    });
  }

  async deleteTaskMetadata(taskListId: string, taskId: string): Promise<void> {
    const records = await this.getTaskMetadata(taskListId);
    const nextRecords = { ...records };
    delete nextRecords[taskId];

    await this.setRecord({ [metadataKey(taskListId)]: nextRecords });
  }

  private getRecord(keys: string | string[]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      this.storage.get(keys, (items) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(items as Record<string, unknown>);
      });
    });
  }

  private setRecord(items: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.storage.set(items, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }
}

function metadataKey(taskListId: string): string {
  return `${METADATA_PREFIX}${taskListId}`;
}

function isMetadataRecord(value: unknown): value is Record<string, TaskMatrixMetadata> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isTaskMatrixMetadata);
}

function isTaskMatrixMetadata(value: unknown): value is TaskMatrixMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TaskMatrixMetadata>;
  return (
    typeof candidate.taskId === "string" &&
    typeof candidate.taskListId === "string" &&
    typeof candidate.important === "boolean" &&
    typeof candidate.updatedAt === "string"
  );
}

function normalizeMetadata(metadata: TaskMatrixMetadata): TaskMatrixMetadata {
  return {
    ...metadata,
    schemaVersion: metadata.schemaVersion || CURRENT_METADATA_SCHEMA_VERSION,
    source: metadata.source || "manual"
  };
}
