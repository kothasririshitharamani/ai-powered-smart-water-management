from app.extensions import db
from app.models.farmer_crop import FarmerCrop
from app.models.farmer_profile import FarmerProfile
from app.models.soil_analysis import SoilAnalysisReport
from app.models.user import User
from app.models.water_allocation import WaterAllocationItem, WaterAllocationPlan
from app.models.water_budget import WaterBudget
from app.models.water_loss_report import WaterLossReport
from app.models.water_requirement_estimate import WaterRequirementEstimate
from app.models.water_usage import WaterUsage
from app.models.weather_alert import WeatherAlert

__all__ = [
    "db",
    "FarmerCrop",
    "FarmerProfile",
    "SoilAnalysisReport",
    "User",
    "WaterAllocationItem",
    "WaterAllocationPlan",
    "WaterBudget",
    "WaterLossReport",
    "WaterRequirementEstimate",
    "WaterUsage",
    "WeatherAlert",
]