from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_session
from .models import Task, utc_now
from .schemas import Status, TaskCreate, TaskMove, TaskResponse, TaskUpdate


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Tasklane API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


def ordered_tasks(session: Session, task_status: str) -> list[Task]:
    return list(session.scalars(select(Task).where(Task.status == task_status).order_by(Task.position, Task.created_at)))


def renumber(session: Session, task_status: str) -> None:
    for position, task in enumerate(ordered_tasks(session, task_status)):
        task.position = position


def get_task_or_404(task_id: str, session: Session) -> Task:
    task = session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[TaskResponse], response_model_by_alias=True)
def list_tasks(session: Session = Depends(get_session)) -> list[Task]:
    statuses = [item.value for item in Status]
    tasks: list[Task] = []
    for task_status in statuses:
        tasks.extend(ordered_tasks(session, task_status))
    return tasks


@app.get("/api/tasks/{task_id}", response_model=TaskResponse, response_model_by_alias=True)
def get_task(task_id: str, session: Session = Depends(get_session)) -> Task:
    return get_task_or_404(task_id, session)


@app.post("/api/tasks", response_model=TaskResponse, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, session: Session = Depends(get_session)) -> Task:
    created_at = utc_now()
    task = Task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority.value if payload.priority else None,
        due_date=payload.due_date,
        status=Status.TODO.value,
        position=len(ordered_tasks(session, Status.TODO.value)),
        created_at=created_at,
        updated_at=created_at,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@app.patch("/api/tasks/{task_id}", response_model=TaskResponse, response_model_by_alias=True)
def update_task(task_id: str, payload: TaskUpdate, session: Session = Depends(get_session)) -> Task:
    task = get_task_or_404(task_id, session)
    changes = payload.model_dump(exclude_unset=True)
    old_status = task.status
    new_status = changes.pop("status", None)
    for field, value in changes.items():
        if field == "priority" and value is not None:
            value = value.value
        setattr(task, field, value)
    if new_status is not None and new_status.value != old_status:
        task.status = new_status.value
        task.position = len(ordered_tasks(session, new_status.value))
        renumber(session, old_status)
    session.commit()
    session.refresh(task)
    return task


@app.post("/api/tasks/{task_id}/move", response_model=TaskResponse, response_model_by_alias=True)
def move_task(task_id: str, payload: TaskMove, session: Session = Depends(get_session)) -> Task:
    task = get_task_or_404(task_id, session)
    old_status = task.status
    destination_status = payload.status.value
    # Remove the task from its current ordered sequence before computing its new position.
    task.status = "__moving__"
    session.flush()
    renumber(session, old_status)
    destination = ordered_tasks(session, destination_status)
    insert_at = min(payload.destination_index, len(destination))
    for item in destination[insert_at:]:
        item.position += 1
    task.status = destination_status
    task.position = insert_at
    session.commit()
    session.refresh(task)
    return task


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, session: Session = Depends(get_session)) -> Response:
    task = get_task_or_404(task_id, session)
    task_status = task.status
    session.delete(task)
    session.flush()
    renumber(session, task_status)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
