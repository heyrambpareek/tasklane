from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_session
from app.main import app


def make_client(tmp_path: Path) -> TestClient:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_session():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = override_session
    return TestClient(app)


def test_create_defaults_to_todo_and_trims_title(tmp_path: Path):
    with make_client(tmp_path) as client:
        response = client.post("/api/tasks", json={"title": "  Write tests  ", "priority": "high", "dueDate": "2026-09-20"})
    assert response.status_code == 201
    task = response.json()
    assert task["title"] == "Write tests"
    assert task["status"] == "todo"
    assert task["position"] == 0
    assert task["dueDate"] == "2026-09-20"
    assert task["createdAt"] == task["updatedAt"]


def test_invalid_title_is_rejected(tmp_path: Path):
    with make_client(tmp_path) as client:
        response = client.post("/api/tasks", json={"title": "   "})
    assert response.status_code == 422


def test_blank_optional_fields_match_the_frontend_contract(tmp_path: Path):
    with make_client(tmp_path) as client:
        response = client.post("/api/tasks", json={"title": "No extras", "priority": "", "dueDate": ""})
    assert response.status_code == 201
    assert response.json()["priority"] == ""
    assert response.json()["dueDate"] == ""


def test_move_persists_column_order_and_update_changes_timestamp(tmp_path: Path):
    with make_client(tmp_path) as client:
        first = client.post("/api/tasks", json={"title": "First"}).json()
        second = client.post("/api/tasks", json={"title": "Second"}).json()
        moved = client.post(f"/api/tasks/{second['id']}/move", json={"status": "todo", "destinationIndex": 0})
        assert moved.status_code == 200
        listed = client.get("/api/tasks").json()
        assert [task["id"] for task in listed] == [second["id"], first["id"]]
        changed = client.patch(f"/api/tasks/{first['id']}", json={"status": "done"})
    assert changed.status_code == 200
    assert changed.json()["status"] == "done"
    assert changed.json()["createdAt"] == first["createdAt"]


def test_delete_renumbers_remaining_tasks(tmp_path: Path):
    with make_client(tmp_path) as client:
        first = client.post("/api/tasks", json={"title": "First"}).json()
        second = client.post("/api/tasks", json={"title": "Second"}).json()
        assert client.delete(f"/api/tasks/{first['id']}").status_code == 204
        listed = client.get("/api/tasks").json()
    assert listed[0]["id"] == second["id"]
    assert listed[0]["position"] == 0
