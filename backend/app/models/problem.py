import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Problem(Base):
    """
    Problem bank - reusable problems indexed by subject/grade/difficulty.
    Problems use {name} placeholder for personalization.
    """
    __tablename__ = "problems"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subject: Mapped[str] = mapped_column(String(20), nullable=False)  # 'math' | 'reading'
    grade: Mapped[str] = mapped_column(String(10), nullable=False)  # 'K', '1', ... '12'
    difficulty_level: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    problem_text: Mapped[str] = mapped_column(Text, nullable=False)  # Uses {name} placeholder
    solution: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_problems_lookup", "subject", "grade", "difficulty_level"),
    )
