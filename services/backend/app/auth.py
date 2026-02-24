import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from app.core import get_settings

settings = get_settings()

PBKDF2_ITERATIONS = 390000


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode('utf-8').rstrip('=')


def _b64url_decode(encoded: str) -> bytes:
    padding_len = (-len(encoded)) % 4
    return base64.urlsafe_b64decode(encoded + ('=' * padding_len))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        PBKDF2_ITERATIONS,
    )
    return f'pbkdf2_sha256${PBKDF2_ITERATIONS}${_b64url_encode(salt)}${_b64url_encode(digest)}'


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt_raw, digest_raw = encoded_hash.split('$', maxsplit=3)
        if algorithm != 'pbkdf2_sha256':
            return False
        iterations = int(iterations_raw)
        salt = _b64url_decode(salt_raw)
        expected = _b64url_decode(digest_raw)
    except Exception:
        return False

    actual = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual, expected)


def _sign_payload(encoded_payload: str) -> str:
    raw = hmac.new(
        settings.auth_secret_key.encode('utf-8'),
        encoded_payload.encode('utf-8'),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(raw)


def _encode_token(payload: dict) -> str:
    payload_json = json.dumps(payload, ensure_ascii=True, separators=(',', ':'), sort_keys=True).encode('utf-8')
    encoded_payload = _b64url_encode(payload_json)
    signature = _sign_payload(encoded_payload)
    return f'{encoded_payload}.{signature}'


def issue_access_token(user_id: int) -> tuple[str, int]:
    expires_in = settings.auth_access_token_minutes * 60
    now = int(datetime.now(timezone.utc).timestamp())
    payload = {
        'sub': str(user_id),
        'typ': 'access',
        'iat': now,
        'exp': now + expires_in,
        'jti': secrets.token_urlsafe(12),
    }
    return _encode_token(payload), expires_in


def issue_refresh_token(user_id: int) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.auth_refresh_token_days)
    payload = {
        'sub': str(user_id),
        'typ': 'refresh',
        'iat': int(now.timestamp()),
        'exp': int(expires_at.timestamp()),
        'jti': secrets.token_urlsafe(20),
    }
    return _encode_token(payload), expires_at


def decode_token(token: str, expected_type: str | None = None) -> dict:
    try:
        encoded_payload, encoded_sig = token.split('.', maxsplit=1)
    except ValueError as exc:
        raise ValueError('invalid token format') from exc

    expected_sig = _sign_payload(encoded_payload)
    if not hmac.compare_digest(encoded_sig, expected_sig):
        raise ValueError('invalid token signature')

    try:
        payload_raw = _b64url_decode(encoded_payload)
        payload = json.loads(payload_raw)
    except Exception as exc:
        raise ValueError('invalid token payload') from exc

    if expected_type and payload.get('typ') != expected_type:
        raise ValueError('invalid token type')

    try:
        exp = int(payload.get('exp'))
    except Exception as exc:
        raise ValueError('invalid token expiry') from exc

    now_ts = int(datetime.now(timezone.utc).timestamp())
    if exp <= now_ts:
        raise ValueError('token expired')

    return payload


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

