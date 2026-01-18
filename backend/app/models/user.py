import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    google_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    picture_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    country: Mapped[str] = mapped_column(String(10), default="US")
    preferred_model: Mapped[str] = mapped_column(String(50), default="gpt-4o-mini")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    kids: Mapped[list["Kid"]] = relationship("Kid", back_populates="user", cascade="all, delete-orphan")
    stories: Mapped[list["UserStory"]] = relationship("UserStory", back_populates="user", cascade="all, delete-orphan")
    seen_problems: Mapped[list["UserSeenProblem"]] = relationship("UserSeenProblem", back_populates="user", cascade="all, delete-orphan")
