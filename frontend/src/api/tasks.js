// The sole boundary between the UI and task data. Keep backend details here so
// the board components remain independent of the transport and API shape.

const API_BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers
    });
  } catch {
    throw new Error("Unable to reach Tasklane. Is the backend running?");
  }

  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      const body = await response.json();
      if (Array.isArray(body.detail)) message = body.detail.map((item) => item.msg).join(" ");
      else if (body.detail) message = body.detail;
    } catch {
      // Keep the generic message when the server does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined;
  return response.json();
}

function normalizeTask(task) {
  return { ...task, priority: task.priority || "", dueDate: task.dueDate || "" };
}

export const taskApi = {
  async list() {
    const tasks = await request("/api/tasks");
    return tasks.map(normalizeTask);
  },

  async create(values) {
    const task = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: values.title, description: values.description || "", priority: values.priority || "", dueDate: values.dueDate || "" })
    });
    return normalizeTask(task);
  },

  async update(id, values) {
    const task = await request(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ title: values.title, description: values.description || "", priority: values.priority || "", dueDate: values.dueDate || "", status: values.status })
    });
    return normalizeTask(task);
  },

  async remove(id) {
    await request(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { id };
  },

  async move(id, destinationStatus, destinationIndex) {
    const task = await request(`/api/tasks/${encodeURIComponent(id)}/move`, {
      method: "POST",
      body: JSON.stringify({ status: destinationStatus, destinationIndex })
    });
    return normalizeTask(task);
  }
};
