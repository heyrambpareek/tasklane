// This is the sole boundary between the UI and task data. Replace these
// functions with HTTP calls when the backend is introduced.

const delay = (value, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
const statuses = ["todo", "in-progress", "blocked", "done"];
let tasks = [
  { id: "task-1", title: "Sketch weekly priorities", description: "Pick the three outcomes that matter most this week.", priority: "high", dueDate: localDate(-1), status: "todo", position: 0, createdAt: "2026-09-10T08:30:00.000Z", updatedAt: "2026-09-12T08:30:00.000Z" },
  { id: "task-2", title: "Review project notes", description: "Consolidate the notes from last planning session.", priority: "medium", dueDate: localDate(0), status: "todo", position: 1, createdAt: "2026-09-11T09:00:00.000Z", updatedAt: "2026-09-11T09:00:00.000Z" },
  { id: "task-3", title: "Prepare presentation outline", description: "Create a short structure before adding slides.", priority: "high", dueDate: localDate(2), status: "in-progress", position: 0, createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-13T14:10:00.000Z" },
  { id: "task-4", title: "Wait for design feedback", description: "Need the final copy before this can move forward.", priority: "low", dueDate: "", status: "blocked", position: 0, createdAt: "2026-09-08T11:00:00.000Z", updatedAt: "2026-09-08T11:00:00.000Z" },
  { id: "task-5", title: "Set up a focused workspace", description: "", priority: "low", dueDate: localDate(-3), status: "done", position: 0, createdAt: "2026-09-07T11:00:00.000Z", updatedAt: "2026-09-12T16:20:00.000Z" }
];

function localDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function validateTitle(title) {
  const trimmed = title?.trim() ?? "";
  if (!trimmed) throw new Error("Give this task a title.");
  if (trimmed.length > 120) throw new Error("Titles can be at most 120 characters.");
  return trimmed;
}

function sorted() {
  return [...tasks].sort((a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status) || a.position - b.position);
}

export const taskApi = {
  list: () => delay(sorted(), 500),
  async create(values) {
    const status = "todo";
    const task = { id: crypto.randomUUID(), title: validateTitle(values.title), description: values.description?.trim() ?? "", priority: values.priority || "", dueDate: values.dueDate || "", status, position: tasks.filter((item) => item.status === status).length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    tasks.push(task);
    return delay(task);
  },
  async update(id, values) {
    const task = tasks.find((item) => item.id === id);
    if (!task) throw new Error("This task no longer exists.");
    const nextStatus = values.status ?? task.status;
    if (!statuses.includes(nextStatus)) throw new Error("That status is not available.");
    const statusChanged = nextStatus !== task.status;
    if (statusChanged) task.position = tasks.filter((item) => item.status === nextStatus).length;
    Object.assign(task, { ...values, title: values.title === undefined ? task.title : validateTitle(values.title), description: values.description === undefined ? task.description : values.description.trim(), dueDate: values.dueDate ?? task.dueDate, priority: values.priority ?? task.priority, status: nextStatus, updatedAt: new Date().toISOString() });
    normalizePositions();
    return delay(task);
  },
  async remove(id) {
    const exists = tasks.some((item) => item.id === id);
    if (!exists) throw new Error("This task no longer exists.");
    tasks = tasks.filter((item) => item.id !== id);
    normalizePositions();
    return delay({ id });
  },
  async move(id, destinationStatus, destinationIndex) {
    const task = tasks.find((item) => item.id === id);
    if (!task || !statuses.includes(destinationStatus)) throw new Error("Unable to move that task.");
    tasks = tasks.filter((item) => item.id !== id);
    const destination = tasks.filter((item) => item.status === destinationStatus).sort((a, b) => a.position - b.position);
    destination.splice(Math.max(0, Math.min(destinationIndex, destination.length)), 0, { ...task, status: destinationStatus, updatedAt: new Date().toISOString() });
    tasks = [...tasks.filter((item) => item.status !== destinationStatus), ...destination];
    normalizePositions();
    return delay(tasks.find((item) => item.id === id));
  }
};

function normalizePositions() {
  statuses.forEach((status) => tasks.filter((item) => item.status === status).sort((a, b) => a.position - b.position).forEach((item, index) => { item.position = index; }));
}
