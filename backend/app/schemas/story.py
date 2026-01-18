from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Literal


class StoryGenerateRequest(BaseModel):
    subject: Literal["math", "reading"]
    mode: Literal["plot", "story"]
    role: str = Field(..., min_length=1, max_length=255)
    theme: str = Field(..., min_length=1, max_length=255)
    questions_per_kid: int = Field(..., ge=1, le=5)
    kid_ids: list[UUID] = Field(..., min_length=1)


class ProblemResponse(BaseModel):
    kid_alias: str
    kid_name: str
    text: str
    solution: str


class StageResponse(BaseModel):
    stage_number: int
    content: str
    problems: list[ProblemResponse]


class StoryKidResponse(BaseModel):
    id: UUID
    name: str
    grade: str
    difficulty_level: int
    alias: str


class StoryResponse(BaseModel):
    id: UUID
    title: str
    subject: str
    mode: str
    role: str
    theme: str
    kids: list[StoryKidResponse]
    stages: list[StageResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class StoryListItemResponse(BaseModel):
    id: UUID
    title: str
    subject: str
    mode: str
    num_stages: int
    num_kids: int
    kid_names: list[str]
    created_at: datetime


class StoryListResponse(BaseModel):
    stories: list[StoryListItemResponse]
    total: int
