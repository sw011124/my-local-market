from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'My Local Market API'
    env: str = 'dev'
    api_prefix: str = '/api/v1'
    database_url: str = 'postgresql+psycopg://postgres:postgres@db:5432/market'
    cors_origins: str = '*'
    same_day_cutoff_hour: int = 19
    time_zone: str = 'Asia/Seoul'
    auth_secret_key: str = 'change-me-in-production'
    auth_access_token_minutes: int = 60
    auth_refresh_token_days: int = 14


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
