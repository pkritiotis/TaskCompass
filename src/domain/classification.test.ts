import { describe, expect, it } from "vitest";
import {
  classifyTasks,
  createMetadataForQuadrant,
  isTaskDueTodayOrOverdue,
  quadrantToFlags
} from "./classification";
import { createTaskMetadata } from "./metadataStore";
import type { GoogleTask } from "./googleTasks";

const baseTask: GoogleTask = {
  id: "task-1",
  title: "Pay invoice",
  status: "needsAction"
};

describe("classification", () => {
  it("treats overdue and due-today tasks as urgent", () => {
    const now = new Date("2026-05-22T15:00:00");

    expect(isTaskDueTodayOrOverdue("2026-05-21T00:00:00.000Z", now)).toBe(true);
    expect(isTaskDueTodayOrOverdue("2026-05-22T00:00:00.000Z", now)).toBe(true);
    expect(isTaskDueTodayOrOverdue("2026-05-23T00:00:00.000Z", now)).toBe(false);
    expect(isTaskDueTodayOrOverdue(undefined, now)).toBe(false);
  });

  it("defaults unclassified tasks to not important", () => {
    const [classifiedTask] = classifyTasks({
      tasks: [baseTask],
      taskListId: "list-1",
      metadataByTaskId: {},
      now: new Date("2026-05-22T15:00:00")
    });

    expect(classifiedTask.important).toBe(false);
    expect(classifiedTask.urgent).toBe(false);
    expect(classifiedTask.quadrantId).toBe("not-urgent-not-important");
  });

  it("uses saved metadata over default importance and urgency rules", () => {
    const [classifiedTask] = classifyTasks({
      tasks: [{ ...baseTask, due: "2026-05-22T00:00:00.000Z" }],
      taskListId: "list-1",
      metadataByTaskId: {
        "task-1": createTaskMetadata({
          taskId: "task-1",
          taskListId: "list-1",
          important: true,
          urgentOverride: false
        })
      },
      now: new Date("2026-05-22T15:00:00")
    });

    expect(classifiedTask.important).toBe(true);
    expect(classifiedTask.urgent).toBe(false);
    expect(classifiedTask.quadrantId).toBe("not-urgent-important");
  });

  it("creates manual metadata for quadrant moves", () => {
    const metadata = createMetadataForQuadrant({
      taskId: "task-1",
      taskListId: "list-1",
      quadrantId: "urgent-important",
      updatedAt: "2026-05-22T12:00:00.000Z"
    });

    expect(metadata).toMatchObject({
      schemaVersion: 1,
      taskId: "task-1",
      taskListId: "list-1",
      important: true,
      urgentOverride: true,
      source: "manual",
      updatedAt: "2026-05-22T12:00:00.000Z"
    });
    expect(quadrantToFlags("urgent-not-important")).toEqual({
      important: false,
      urgent: true
    });
  });
});
