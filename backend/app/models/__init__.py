from app.extensions import db
from app.models.farmer_profile import FarmerProfile
from app.models.user import User
from app.models.water_budget import WaterBudget
from app.models.water_loss_report import WaterLossReport
from app.models.water_usage import WaterUsage
from app.models.weather_alert import WeatherAlert

__all__ = [
    "db",
    "FarmerProfile",
    "User",
    "WaterBudget",
    "WaterLossReport",
    "WaterUsage",
    "WeatherAlert",
]