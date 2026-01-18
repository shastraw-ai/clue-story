from datetime import datetime, timedelta
from uuid import UUID
import httpx
from jose import jwt, JWTError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.config import get_settings

settings = get_settings()


class AuthService:
    @staticmethod
    async def verify_google_token(token: str) -> dict:
        """
        Verify Google ID token and return user info.
        """
        try:
            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.google_client_id
            )

            # Check issuer
            if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
                raise ValueError("Wrong issuer")

            return {
                "google_id": idinfo["sub"],
                "email": idinfo["email"],
                "name": idinfo.get("name"),
                "picture_url": idinfo.get("picture"),
            }
        except ValueError as e:
            raise ValueError(f"Invalid Google token: {e}")

    @staticmethod
    def create_access_token(user_id: UUID, email: str) -> str:
        """
        Create a JWT access token.
        """
        expire = datetime.utcnow() + timedelta(days=settings.jwt_expire_days)
        payload = {
            "sub": str(user_id),
            "email": email,
            "exp": expire,
            "iat": datetime.utcnow(),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    @staticmethod
    def verify_access_token(token: str) -> dict:
        """
        Verify JWT access token and return payload.
        """
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm]
            )
            return payload
        except JWTError as e:
            raise ValueError(f"Invalid token: {e}")


auth_service = AuthService()
