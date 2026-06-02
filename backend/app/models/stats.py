from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..core.database import Base


class PlayerStats(Base):
    __tablename__ = "player_stats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), index=True)
    season: Mapped[str] = mapped_column(String(8))   # e.g. "2025-26"
    season_type: Mapped[str] = mapped_column(String(16), default="Regular Season")

    games_played: Mapped[int | None] = mapped_column(Integer)
    games_started: Mapped[int | None] = mapped_column(Integer)
    minutes_per_game: Mapped[float | None] = mapped_column(Float)

    points: Mapped[float | None] = mapped_column(Float)
    rebounds: Mapped[float | None] = mapped_column(Float)
    assists: Mapped[float | None] = mapped_column(Float)
    steals: Mapped[float | None] = mapped_column(Float)
    blocks: Mapped[float | None] = mapped_column(Float)
    turnovers: Mapped[float | None] = mapped_column(Float)
    fouls: Mapped[float | None] = mapped_column(Float)

    fg_made: Mapped[float | None] = mapped_column(Float)
    fg_attempted: Mapped[float | None] = mapped_column(Float)
    fg_pct: Mapped[float | None] = mapped_column(Float)

    three_made: Mapped[float | None] = mapped_column(Float)
    three_attempted: Mapped[float | None] = mapped_column(Float)
    three_pct: Mapped[float | None] = mapped_column(Float)

    ft_made: Mapped[float | None] = mapped_column(Float)
    ft_attempted: Mapped[float | None] = mapped_column(Float)
    ft_pct: Mapped[float | None] = mapped_column(Float)

    off_rebounds: Mapped[float | None] = mapped_column(Float)
    def_rebounds: Mapped[float | None] = mapped_column(Float)

    plus_minus: Mapped[float | None] = mapped_column(Float)

    player: Mapped["Player"] = relationship("Player", back_populates="stats")
