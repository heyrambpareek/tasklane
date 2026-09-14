# Tasklane backend

The backend is a FastAPI application backed by SQLite. It owns task validation,
timestamps, status changes, and within-column positions.

## Run locally

From `backend/`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive API documentation
is at `/docs`. By default, the SQLite database is `backend/tasklane.db`. Set
`TASKLANE_DATABASE_URL` to use another SQLAlchemy-compatible database URL.

## API

- `GET /api/tasks` — list tasks, ordered by column then position.
- `POST /api/tasks` — create a task (always starts in `todo`).
- `GET`, `PATCH`, `DELETE /api/tasks/{taskId}` — retrieve, edit, or remove a task.
- `POST /api/tasks/{taskId}/move` — move/reorder with `{ "status", "destinationIndex" }`.

Run backend tests with `pytest`.
