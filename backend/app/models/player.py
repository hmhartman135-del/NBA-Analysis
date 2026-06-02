from sqlalchemy import String, Integer, Float, Boolean, Date, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..core.database import Base


class Player(Base):
    __tablename__ = "players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nba_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    first_name: Mapped[str] = mapped_column(String(64))
    last_name: Mapped[str] = mapped_column(String(64))
    birth_date: Mapped[Date | None] = mapped_column(Date)
    age: Mapped[int | None] = mapped_column(Integer)

    position: Mapped[str | None] = mapped_column(String(8))   # PG, SG, SF, PF, C
    secondary_positions: Mapped[list | None] = mapped_column(JSON)

    status: Mapped[str] = mapped_column(String(32), default="active")  # active, injured, two-way, g-league
    jersey_number: Mapped[str | None] = mapped_column(String(4))
    height: Mapped[str | None] = mapped_column(String(8))   # e.g. "6-7"
    weight: Mapped[int | None] = mapped_column(Integer)     # lbs
    country: Mapped[str | None] = mapped_column(String(64))
    draft_year: Mapped[int | None] = mapped_column(Integer)
    draft_round: Mapped[int | None] = mapped_column(Integer)
    draft_number: Mapped[int | None] = mapped_column(Integer)

    team_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"))
    team: Mapped["Team | None"] = relationship("Team", back_populates="players")

    stats: Mapped[list["PlayerStats"]] = relationship("PlayerStats", back_populates="player")
