from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Status(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    BLOCKED = "blocked"
    DONE = "done"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: Priority | None = None
    due_date: date | None = Field(default=None, validation_alias="dueDate")

    @field_validator("priority", "due_date", mode="before")
    @classmethod
    def blank_optional_values_are_null(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title is required.")
        if len(value) > 120:
            raise ValueError("Title must be at most 120 characters.")
        return value

    @field_validator("description")
    @classmethod
    def trim_description(cls, value: str) -> str:
        return value.strip()


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: Priority | None = None
    due_date: date | None = Field(default=None, validation_alias="dueDate")
    status: Status | None = None

    @field_validator("priority", "due_date", mode="before")
    @classmethod
    def blank_optional_values_are_null(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Title is required.")
        if len(value) > 120:
            raise ValueError("Title must be at most 120 characters.")
        return value

    @field_validator("description")
    @classmethod
    def trim_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class TaskMove(BaseModel):
    status: Status
    destination_index: int = Field(validation_alias="destinationIndex", ge=0)


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    title: str
    description: str
    priority: Priority | Literal[""] = ""
    due_date: date | Literal[""] = Field(default="", serialization_alias="dueDate")
    status: Status
    position: int
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    @field_validator("priority", "due_date", mode="before")
    @classmethod
    def null_optional_values_are_blank(cls, value: object) -> object:
        return "" if value is None else value
