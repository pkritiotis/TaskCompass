import { describe, expect, it, vi } from "vitest";
import { createTaskMetadata } from "../domain/metadataStore";
import { ChromeSyncMetadataStore } from "./chromeSyncMetadataStore";

function createChromeStorageFake(initialData: Record<string, unknown> = {}) {
  const data = { ...initialData };

  return {
    data,
    storage: {
      get: vi.fn((keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
        const requestedKeys = Array.isArray(keys) ? keys : [keys];
        const result = requestedKeys.reduce<Record<string, unknown>>((accumulator, key) => {
          if (key in data) {
            accumulator[key] = data[key];
          }
          return accumulator;
        }, {});

        callback(result);
      }),
      set: vi.fn((items: Record<string, unknown>, callback: () => void) => {
        Object.assign(data, items);
        callback();
      }),
      remove: vi.fn((keys: string | string[], callback: () => void) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          delete data[key];
        }
        callback();
      })
    }
  };
}

describe("ChromeSyncMetadataStore", () => {
  it("stores and retrieves the selected task list", async () => {
    vi.stubGlobal("chrome", { runtime: { lastError: undefined } });
    const fake = createChromeStorageFake();
    const store = new ChromeSyncMetadataStore(fake.storage);

    await store.setSelectedTaskList("list-1");

    await expect(store.getSelectedTaskList()).resolves.toBe("list-1");
  });

  it("serializes metadata by task list and task id", async () => {
    vi.stubGlobal("chrome", { runtime: { lastError: undefined } });
    const fake = createChromeStorageFake();
    const store = new ChromeSyncMetadataStore(fake.storage);

    await store.upsertTaskMetadata(
      createTaskMetadata({
        taskId: "task-1",
        taskListId: "list-1",
        important: true,
        urgentOverride: false,
        updatedAt: "2026-05-22T12:00:00.000Z"
      })
    );

    await expect(store.getTaskMetadata("list-1")).resolves.toEqual({
      "task-1": {
        schemaVersion: 1,
        taskId: "task-1",
        taskListId: "list-1",
        important: true,
        urgentOverride: false,
        source: "manual",
        updatedAt: "2026-05-22T12:00:00.000Z"
      }
    });
    expect(fake.data).toHaveProperty("taskMetadata:list-1");
  });

  it("deletes task metadata without affecting other task records", async () => {
    vi.stubGlobal("chrome", { runtime: { lastError: undefined } });
    const fake = createChromeStorageFake();
    const store = new ChromeSyncMetadataStore(fake.storage);

    await store.upsertTaskMetadata(
      createTaskMetadata({ taskId: "task-1", taskListId: "list-1", important: true })
    );
    await store.upsertTaskMetadata(
      createTaskMetadata({ taskId: "task-2", taskListId: "list-1", important: false })
    );

    await store.deleteTaskMetadata("list-1", "task-1");

    const records = await store.getTaskMetadata("list-1");
    expect(records["task-1"]).toBeUndefined();
    expect(records["task-2"]).toBeDefined();
  });
});
