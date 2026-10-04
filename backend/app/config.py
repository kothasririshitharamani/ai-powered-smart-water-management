import os
from dotenv import load_dotenv

# Search and load .env from backend/ or repository root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))
load_dotenv()


class Config:
    SECRET_KEY = os.getenv(
        "SECRET_KEY", "development-only-change-this-secret-key-before-deployment"
    )
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY", "development-only-change-this-jwt-signing-key-before-deployment"
    )
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///smart_water.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60
    WATER_LOW_REMAINING_PERCENT = float(os.getenv("WATER_LOW_REMAINING_PERCENT", "30"))
    WATER_VERY_LOW_REMAINING_PERCENT = float(
        os.getenv("WATER_VERY_LOW_REMAINING_PERCENT", "15")
    )
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081"
        ).split(",")
        if origin.strip()
    ]
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")