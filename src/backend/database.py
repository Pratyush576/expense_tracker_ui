from sqlmodel import create_engine, SQLModel, Session
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATABASE_FILE = PROJECT_ROOT / "database.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

engine = create_engine(DATABASE_URL, echo=True)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
