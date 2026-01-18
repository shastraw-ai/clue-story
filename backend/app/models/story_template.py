import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StoryTemplate(Base):
    """
    Reusable story templates - narratives that can be shared across users.
    Templates are unique per theme/role/mode/num_stages combination.
    """
    __tablename__ = "story_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    theme: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)  # 'plot' | 'story'
    num_stages: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_narrative: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    stages: Mapped[list["TemplateStage"]] = relationship(
        "TemplateStage", back_populates="template", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("theme", "role", "mode", "num_stages", name="uq_story_template"),
    )


class TemplateStage(Base):
    """
    Individual stages within a story template.
    Content uses alias placeholders that get replaced with actual kid names.
    """
    __tablename__ = "template_stages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("story_templates.id", ondelete="CASCADE"), nullable=False
    )
    stage_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    template: Mapped["StoryTemplate"] = relationship("StoryTemplate", back_populates="stages")

    __table_args__ = (
        UniqueConstraint("template_id", "stage_number", name="uq_template_stage"),
    )
