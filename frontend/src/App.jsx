import { useEffect, useMemo, useState } from "react";
import { taskApi } from "./api/tasks";

const COLUMNS = [
  { id: "todo", label: "To Do", hint: "Ready when you are" },
  { id: "in-progress", label: "In Progress", hint: "In motion" },
  { id: "blocked", label: "Blocked", hint: "Waiting on something" },
  { id: "done", label: "Done", hint: "Completed work" }
];
const initialForm = { title: "", description: "", priority: "", dueDate: "", status: "todo" };

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ query: "", status: "", priority: "", due: "all" });
  const [modal, setModal] = useState(null);
  const [draggedId, setDraggedId] = useState(null);

  const loadTasks = async () => {
    setLoading(true); setError("");
    try { setTasks(await taskApi.list()); } catch (err) { setError(err.message || "We couldn’t load your tasks."); } finally { setLoading(false); }
  };
  useEffect(() => { loadTasks(); }, []);

  const visibleTasks = useMemo(() => tasks.filter((task) => matches(task, filters)), [tasks, filters]);
  const hasActiveFilters = filters.query || filters.status || filters.priority || filters.due !== "all";
  const applyMutation = async (work) => {
    setError("");
    try { await work(); setTasks(await taskApi.list()); } catch (err) { setError(err.message || "That change didn’t save. Please try again."); }
  };
  const saveTask = async (values) => {
    await applyMutation(() => modal?.task ? taskApi.update(modal.task.id, values) : taskApi.create(values));
    setModal(null);
  };
  const move = async (id, status, index) => { await applyMutation(() => taskApi.move(id, status, index)); };

  return <main className="app-shell">
    <header className="topbar">
      <div><p className="eyebrow">PERSONAL WORKSPACE</p><h1>Tasklane</h1><p className="subtitle">A clear place for what needs your attention.</p></div>
      <button className="primary" onClick={() => setModal({ task: null })}><span>+</span> New task</button>
    </header>
    <section className="controls" aria-label="Search and filter tasks">
      <label className="search"><span aria-hidden="true">⌕</span><input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Search tasks" aria-label="Search tasks" /></label>
      <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status"><option value="">All statuses</option>{COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}</select>
      <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} aria-label="Filter by priority"><option value="">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <select value={filters.due} onChange={(e) => setFilters({ ...filters, due: e.target.value })} aria-label="Filter by due date"><option value="all">All dates</option><option value="overdue">Overdue</option><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="none">No due date</option></select>
      {hasActiveFilters && <button className="text-button" onClick={() => setFilters({ query: "", status: "", priority: "", due: "all" })}>Clear filters</button>}
    </section>
    {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={loadTasks}>Retry</button></div>}
    {loading ? <BoardSkeleton /> : !tasks.length ? <EmptyState onCreate={() => setModal({ task: null })} /> : !visibleTasks.length ? <NoMatches onClear={() => setFilters({ query: "", status: "", priority: "", due: "all" })} /> :
      <section className="board" aria-label="Task board">{COLUMNS.map((column) => <Column key={column.id} column={column} tasks={visibleTasks.filter((task) => task.status === column.id)} draggedId={draggedId} onDragStart={setDraggedId} onDrop={(index) => { if (draggedId) move(draggedId, column.id, index); setDraggedId(null); }} onOpen={(task) => setModal({ task })} />)}</section>}
    {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} onSave={saveTask} onDelete={async (task) => { if (window.confirm(`Delete “${task.title}”? This can’t be undone.`)) { await applyMutation(() => taskApi.remove(task.id)); setModal(null); } }} />}
  </main>;
}

function Column({ column, tasks, draggedId, onDragStart, onDrop, onOpen }) {
  return <article className="column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onDrop(tasks.length); }}>
    <header className="column-header"><div><h2>{column.label}</h2><p>{column.hint}</p></div><span className="count">{tasks.length}</span></header>
    <div className="task-list">{tasks.map((task, index) => <div key={task.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); onDrop(index); }}><TaskCard task={task} isDragging={draggedId === task.id} onDragStart={onDragStart} onOpen={onOpen} /></div>)}</div>
    {!tasks.length && <div className="drop-zone">Drop a task here</div>}
  </article>;
}

function TaskCard({ task, isDragging, onDragStart, onOpen }) {
  const overdue = task.status !== "done" && task.dueDate && task.dueDate < today();
  return <button className={`task-card ${isDragging ? "dragging" : ""}`} draggable onDragStart={() => onDragStart(task.id)} onDragEnd={() => onDragStart(null)} onClick={() => onOpen(task)}>
    <span className="drag-handle" aria-label="Drag task">⠿</span>
    <div className="task-card-body"><div className="card-title-row"><h3>{task.title}</h3>{task.priority && <span className={`priority ${task.priority}`}>{task.priority}</span>}</div>
      {task.description && <p>{task.description}</p>}
      {task.dueDate && <span className={`due-date ${overdue ? "overdue" : ""}`}>{overdue ? "Overdue · " : "◷ "}{formatDate(task.dueDate)}</span>}
    </div>
  </button>;
}

function TaskModal({ task, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(task ? pick(task) : initialForm);
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm({ ...form, [key]: value });
  const submit = async (event) => { event.preventDefault(); const title = form.title.trim(); if (!title) return setMessage("A title is required."); if (title.length > 120) return setMessage("Titles can be at most 120 characters."); setSaving(true); try { await onSave({ ...form, title }); } catch (err) { setMessage(err.message); setSaving(false); } };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header><div><p className="eyebrow">{task ? "TASK DETAILS" : "NEW TASK"}</p><h2 id="modal-title">{task ? "Keep it moving" : "What needs doing?"}</h2></div><button className="close" onClick={onClose} aria-label="Close dialog">×</button></header>
    <form onSubmit={submit}><label>Title <input autoFocus value={form.title} maxLength="121" onChange={(e) => update("title", e.target.value)} placeholder="e.g. Plan next week" /> <small>{form.title.length}/120</small></label>
      <label>Description <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Add context, a note, or a useful next step." rows="4" /></label>
      <div className="form-grid"><label>Priority <select value={form.priority} onChange={(e) => update("priority", e.target.value)}><option value="">No priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Due date <input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} /></label></div>
      {task && <label>Status <select value={form.status} onChange={(e) => update("status", e.target.value)}>{COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}</select></label>}
      {message && <p className="form-error" role="alert">{message}</p>}
      {task && <p className="timestamps">Created {formatDateTime(task.createdAt)} · Updated {formatDateTime(task.updatedAt)}</p>}
      <footer>{task ? <button type="button" className="delete" onClick={() => onDelete(task)}>Delete task</button> : <span />}<div><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving…" : task ? "Save changes" : "Create task"}</button></div></footer>
    </form>
  </section></div>;
}

function BoardSkeleton() { return <section className="board">{COLUMNS.map((column) => <article className="column" key={column.id}><header className="column-header"><div><h2>{column.label}</h2><p>{column.hint}</p></div></header><div className="skeleton-card" /><div className="skeleton-card short" /></article>)}</section>; }
function EmptyState({ onCreate }) { return <section className="state"><span>☷</span><h2>Your board is ready.</h2><p>Capture your first task and give it a home.</p><button className="primary" onClick={onCreate}>+ Create your first task</button></section>; }
function NoMatches({ onClear }) { return <section className="state"><span>⌕</span><h2>No matching tasks</h2><p>Try a different search or clear your filters.</p><button className="secondary" onClick={onClear}>Clear filters</button></section>; }
function pick(task) { return { title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate, status: task.status }; }
function today() { return new Date().toLocaleDateString("en-CA"); }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function formatDateTime(value) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function matches(task, filters) { const needle = filters.query.trim().toLowerCase(); if (needle && !`${task.title} ${task.description}`.toLowerCase().includes(needle)) return false; if (filters.status && task.status !== filters.status) return false; if (filters.priority && task.priority !== filters.priority) return false; const current = today(); if (filters.due === "overdue" && !(task.status !== "done" && task.dueDate && task.dueDate < current)) return false; if (filters.due === "today" && task.dueDate !== current) return false; if (filters.due === "upcoming" && !(task.dueDate && task.dueDate > current)) return false; if (filters.due === "none" && task.dueDate) return false; return true; }
