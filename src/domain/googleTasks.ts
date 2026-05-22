export type GoogleTaskList = {
  id: string;
  title: string;
};

export type GoogleTask = {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  position?: string;
  updated?: string;
};

type TaskListsResponse = {
  items?: GoogleTaskList[];
};

type TasksResponse = {
  items?: GoogleTask[];
};

const TASKS_API_BASE = "https://www.googleapis.com/tasks/v1";

async function requestJson<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Google Tasks request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export class GoogleTasksClient {
  constructor(private readonly getToken: () => Promise<string>) {}

  async listTaskLists(): Promise<GoogleTaskList[]> {
    const token = await this.getToken();
    const data = await requestJson<TaskListsResponse>(token, `${TASKS_API_BASE}/users/@me/lists`);
    return data.items ?? [];
  }

  async listIncompleteTasks(taskListId: string): Promise<GoogleTask[]> {
    const token = await this.getToken();
    const params = new URLSearchParams({
      showCompleted: "false",
      showHidden: "false",
      maxResults: "100"
    });

    const data = await requestJson<TasksResponse>(
      token,
      `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`
    );

    return (data.items ?? []).filter((task) => task.status !== "completed");
  }

  async completeTask(taskListId: string, taskId: string): Promise<GoogleTask> {
    const token = await this.getToken();
    return requestJson<GoogleTask>(
      token,
      `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" })
      }
    );
  }
}
