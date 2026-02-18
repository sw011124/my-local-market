from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.seed import seed_if_empty


BASE_DIR = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    cfg = Config(str(BASE_DIR / 'alembic.ini'))
    cfg.set_main_option('script_location', str(BASE_DIR / 'alembic'))
    command.upgrade(cfg, 'head')


def run_seed() -> None:
    with SessionLocal() as db:  # type: Session
        seed_if_empty(db)


def bootstrap() -> None:
    run_migrations()
    run_seed()


if __name__ == '__main__':
    bootstrap()
