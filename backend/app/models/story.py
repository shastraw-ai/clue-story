import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserStory(Base):
    """
    A user's generated story - references a template and contains kid snapshots.
    """
    __tablename__ = "user_stories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("story_templates.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(20), nullable=False)  # 'math' | 'reading'
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="stories")
    template: Mapped["StoryTemplate"] = relationship("StoryTemplate")
    story_kids: Mapped[list["UserStoryKid"]] = relationship(
        "UserStoryKid", back_populates="story", cascade="all, delete-orphan"
    )
    story_problems: Mapped[list["UserStoryProblem"]] = relationship(
        "UserStoryProblem", back_populates="story", cascade="all, delete-orphan"
    )


class UserStoryKid(Base):
    """
    Snapshot of a kid at the time of story generation.
    Preserves the state even if the kid profile is later modified.
    """
    __tablename__ = "user_story_kids"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    story_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_stories.id", ondelete="CASCADE"), nullable=False
    )
    kid_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("kids.id", ondelete="SET NULL"), nullable=True
    )
    kid_name: Mapped[str] = mapped_column(String(100), nullable=False)
    kid_grade: Mapped[str] = mapped_column(String(10), nullable=False)
    kid_difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    kid_alias: Mapped[str] = mapped_column(String(50), nullable=False)

    # Relationships
    story: Mapped["UserStory"] = relationship("UserStory", back_populates="story_kids")
    problems: Mapped[list["UserStoryProblem"]] = relationship(
        "UserStoryProblem", back_populates="story_kid", cascade="all, delete-orphan"
    )


class UserStoryProblem(Base):
    """
    Problem assigned to a kid in a specific story stage.
    Contains rendered text with actual kid name substituted.
    """
    __tablename__ = "user_story_problems"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    story_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_stories.id", ondelete="CASCADE"), nullable=False
    )
    stage_number: Mapped[int] = mapped_column(Integer, nullable=False)
    story_kid_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_story_kids.id", ondelete="CASCADE"), nullable=False
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("problems.id"), nullable=False
    )
    problem_text_rendered: Mapped[str] = mapped_column(Text, nullable=False)
    solution_rendered: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    story: Mapped["UserStory"] = relationship("UserStory", back_populates="story_problems")
    story_kid: Mapped["UserStoryKid"] = relationship("UserStoryKid", back_populates="problems")
    problem: Mapped["Problem"] = relationship("Problem")


class UserSeenProblem(Base):
    """
    Tracks which problems a user has already seen to avoid repetition.
    """
    __tablename__ = "user_seen_problems"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True
    )
    seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="seen_problems")
    problem: Mapped["Problem"] = relationship("Problem")

    __table_args__ = (
        Index("idx_user_seen_problems", "user_id"),
    )
