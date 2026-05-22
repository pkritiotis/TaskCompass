import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { Check, ListChecks, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import {
  classifyTasks,
  createMetadataForQuadrant,
  QUADRANTS,
  type ClassifiedTask,
  type QuadrantId
} from "../domain/classification";
import { GoogleTasksClient, type GoogleTask, type GoogleTaskList } from "../domain/googleTasks";
import type { MatrixMetadataStore } from "../domain/metadataStore";
import { ChromeWebAuthFlowTokenProvider } from "../infrastructure/auth";
import { ChromeSyncMetadataStore } from "../infrastructure/chromeSyncMetadataStore";
import { MatrixQuadrant } from "./components/MatrixQuadrant";

type LoadState = "checking-auth" | "needs-auth" | "loading" | "ready" | "error";

const authProvider = new ChromeWebAuthFlowTokenProvider();
const metadataStore: MatrixMetadataStore = new ChromeSyncMetadataStore();
const googleTasksClient = new GoogleTasksClient(() => authProvider.getToken(false));

export function App() {
  const [state, setState] = useState<LoadState>("checking-auth");
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [classifiedTasks, setClassifiedTasks] = useState<ClassifiedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const selectedTaskList = useMemo(
    () => taskLists.find((taskList) => taskList.id === selectedTaskListId) ?? null,
    [selectedTaskListId, taskLists]
  );

  const loadTasksForList = useCallback(async (taskListId: string) => {
    setState("loading");
    setError(null);

    const [nextTasks, metadataByTaskId] = await Promise.all([
      googleTasksClient.listIncompleteTasks(taskListId),
      metadataStore.getTaskMetadata(taskListId)
    ]);

    setTasks(nextTasks);
    setClassifiedTasks(
      classifyTasks({
        tasks: nextTasks,
        taskListId,
        metadataByTaskId
      })
    );
    setState("ready");
  }, []);

  const loadInitialData = useCallback(async () => {
    setState("checking-auth");
    setError(null);

    try {
      await authProvider.getToken(false);
    } catch {
      setState("needs-auth");
      return;
    }

    try {
      const [lists, rememberedListId] = await Promise.all([
        googleTasksClient.listTaskLists(),
        metadataStore.getSelectedTaskList()
      ]);

      setTaskLists(lists);
      const listId = rememberedListId && lists.some((list) => list.id === rememberedListId)
        ? rememberedListId
        : null;

      setSelectedTaskListId(listId);

      if (listId) {
        await loadTasksForList(listId);
      } else {
        setState("ready");
      }
    } catch (loadError) {
      setError(toErrorMessage(loadError));
      setState("error");
    }
  }, [loadTasksForList]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  async function connectGoogle() {
    setState("loading");
    setError(null);

    try {
      await authProvider.getToken(true);
      await loadInitialData();
    } catch (connectError) {
      setError(toErrorMessage(connectError));
      setState("needs-auth");
    }
  }

  async function disconnectGoogle() {
    setState("loading");
    setError(null);

    try {
      await authProvider.disconnect();
      setTaskLists([]);
      setSelectedTaskListId(null);
      setTasks([]);
      setClassifiedTasks([]);
      setState("needs-auth");
    } catch (disconnectError) {
      setError(toErrorMessage(disconnectError));
      setState("error");
    }
  }

  async function selectTaskList(taskListId: string) {
    setSelectedTaskListId(taskListId);
    await metadataStore.setSelectedTaskList(taskListId);
    await loadTasksForList(taskListId);
  }

  async function refreshTasks() {
    if (!selectedTaskListId) {
      await loadInitialData();
      return;
    }

    try {
      await loadTasksForList(selectedTaskListId);
    } catch (refreshError) {
      setError(toErrorMessage(refreshError));
      setState("error");
    }
  }

  async function completeTask(task: ClassifiedTask) {
    setBusyTaskId(task.task.id);
    setError(null);

    try {
      await googleTasksClient.completeTask(task.taskListId, task.task.id);
      await metadataStore.deleteTaskMetadata(task.taskListId, task.task.id);
      setTasks((currentTasks) => currentTasks.filter((item) => item.id !== task.task.id));
      setClassifiedTasks((currentTasks) =>
        currentTasks.filter((item) => item.task.id !== task.task.id)
      );
    } catch (completeError) {
      setError(toErrorMessage(completeError));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const quadrantId = event.over?.id as QuadrantId | undefined;

    if (!quadrantId || !selectedTaskListId) {
      return;
    }

    const task = classifiedTasks.find((item) => item.task.id === taskId);
    if (!task || task.quadrantId === quadrantId) {
      return;
    }

    const metadata = createMetadataForQuadrant({
      taskId,
      taskListId: selectedTaskListId,
      quadrantId
    });

    await metadataStore.upsertTaskMetadata(metadata);
    setClassifiedTasks((currentTasks) =>
      currentTasks.map((item) => {
        if (item.task.id !== taskId) {
          return item;
        }

        return {
          ...item,
          important: metadata.important,
          urgent: Boolean(metadata.urgentOverride),
          quadrantId,
          metadata
        };
      })
    );
  }

  const groupedTasks = useMemo(() => {
    return QUADRANTS.reduce<Record<QuadrantId, ClassifiedTask[]>>(
      (accumulator, quadrant) => {
        accumulator[quadrant.id] = classifiedTasks.filter(
          (task) => task.quadrantId === quadrant.id
        );
        return accumulator;
      },
      {
        "urgent-important": [],
        "not-urgent-important": [],
        "urgent-not-important": [],
        "not-urgent-not-important": []
      }
    );
  }, [classifiedTasks]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Google Tasks</p>
          <h1>Task Compass</h1>
        </div>
        <div className="header-actions">
          {state === "ready" || state === "error" ? (
            <button className="icon-button" title="Disconnect Google" onClick={disconnectGoogle}>
              <LogOut size={18} />
            </button>
          ) : null}
          <button className="icon-button" title="Refresh tasks" onClick={refreshTasks}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      {state === "checking-auth" || state === "loading" ? <LoadingState /> : null}

      {state === "needs-auth" ? <AuthState onConnect={connectGoogle} /> : null}

      {state === "ready" && !selectedTaskListId ? (
        <ListPicker taskLists={taskLists} onSelect={selectTaskList} />
      ) : null}

      {state === "ready" && selectedTaskListId ? (
        <>
          <section className="list-toolbar">
            <label htmlFor="task-list">Task list</label>
            <select
              id="task-list"
              value={selectedTaskListId}
              onChange={(event) => void selectTaskList(event.target.value)}
            >
              {taskLists.map((taskList) => (
                <option key={taskList.id} value={taskList.id}>
                  {taskList.title}
                </option>
              ))}
            </select>
          </section>

          <DndContext onDragEnd={(event) => void handleDragEnd(event)}>
            <section
              className="matrix-frame"
              aria-label={`${selectedTaskList?.title ?? "Tasks"} matrix`}
            >
              <div className="axis-label axis-row-label axis-row-important">Important</div>
              <div className="axis-label axis-row-label axis-row-not-important">Not important</div>
              <div className="matrix">
                {QUADRANTS.map((quadrant) => (
                  <MatrixQuadrant
                    key={quadrant.id}
                    quadrant={quadrant}
                    tasks={groupedTasks[quadrant.id]}
                    busyTaskId={busyTaskId}
                    onComplete={(task) => void completeTask(task)}
                  />
                ))}
              </div>
              <div className="axis-label axis-column-label axis-column-not-urgent">Not urgent</div>
              <div className="axis-label axis-column-label axis-column-urgent">Urgent</div>
            </section>
          </DndContext>

          <details className="matrix-guide">
            <summary>What the matrix means</summary>
            <p>
              Sort work by importance and urgency: do urgent important tasks, schedule important
              non-urgent tasks, delegate urgent low-importance tasks, and remove what is neither.
            </p>
          </details>

          {tasks.length === 0 ? (
            <div className="empty-state">
              <Check size={20} />
              <p>No incomplete tasks in this list.</p>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function AuthState({ onConnect }: { onConnect: () => void }) {
  return (
    <section className="center-state">
      <ShieldCheck size={32} />
      <h2>Connect Google Tasks</h2>
      <p>Authorize access to load your task lists and update completed tasks.</p>
      <button className="primary-button" onClick={onConnect}>
        Connect
      </button>
    </section>
  );
}

function ListPicker({
  taskLists,
  onSelect
}: {
  taskLists: GoogleTaskList[];
  onSelect: (taskListId: string) => void;
}) {
  if (taskLists.length === 0) {
    return (
      <section className="center-state">
        <ListChecks size={32} />
        <h2>No task lists found</h2>
        <p>Create a Google Tasks list, then refresh this panel.</p>
      </section>
    );
  }

  return (
    <section className="center-state">
      <ListChecks size={32} />
      <h2>Choose a task list</h2>
      <div className="list-picker">
        {taskLists.map((taskList) => (
          <button key={taskList.id} onClick={() => onSelect(taskList.id)}>
            {taskList.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="center-state">
      <RefreshCw className="spin" size={28} />
      <p>Loading tasks...</p>
    </section>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
