import { describe, expect, it } from "vitest";
import { createTaskMetadata, type MatrixMetadataStore, type TaskMatrixMetadata } from "./metadataStore";

class FakeMetadataStore implements MatrixMetadataStore {
  private selectedTaskListId: string | null = null;
  private metadataByListId = new Map<string, Record<string, TaskMatrixMetadata>>();

  async getSelectedTaskList(): Promise<string | null> {
    return this.selectedTaskListId;
  }

  async setSelectedTaskList(taskListId: string): Promise<void> {
    this.selectedTaskListId = taskListId;
  }

  async getTaskMetadata(taskListId: string): Promise<Record<string, TaskMatrixMetadata>> {
    return this.metadataByListId.get(taskListId) ?? {};
  }

  async upsertTaskMetadata(metadata: TaskMatrixMetadata): Promise<void> {
    const records = await this.getTaskMetadata(metadata.taskListId);
    this.metadataByListId.set(metadata.taskListId, {
      ...records,
      [metadata.taskId]: metadata
    });
  }

  async deleteTaskMetadata(taskListId: string, taskId: string): Promise<void> {
    const records = { ...(await this.getTaskMetadata(taskListId)) };
    delete records[taskId];
    this.metadataByListId.set(taskListId, records);
  }
}

describe("MatrixMetadataStore contract", () => {
  it("supports selected list and task metadata lifecycle", async () => {
    const store: MatrixMetadataStore = new FakeMetadataStore();
    const metadata = createTaskMetadata({
      taskId: "task-1",
      taskListId: "list-1",
      important: true,
      urgentOverride: true
    });

    await store.setSelectedTaskList("list-1");
    await store.upsertTaskMetadata(metadata);

    await expect(store.getSelectedTaskList()).resolves.toBe("list-1");
    await expect(store.getTaskMetadata("list-1")).resolves.toEqual({ "task-1": metadata });

    await store.deleteTaskMetadata("list-1", "task-1");
    await expect(store.getTaskMetadata("list-1")).resolves.toEqual({});
  });
});
