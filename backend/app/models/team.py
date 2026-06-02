from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..core.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nba_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    abbreviation: Mapped[str] = mapped_column(String(8), unique=True)
    city: Mapped[str] = mapped_column(String(64))
    nickname: Mapped[str] = mapped_column(String(64))
    conference: Mapped[str | None] = mapped_column(String(16))  # East / West
    division: Mapped[str | None] = mapped_column(String(32))

    players: Mapped[list["Player"]] = relationship("Player", back_populates="team")
