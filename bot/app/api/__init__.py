from app.api.ai import AIApi
from app.api.auth import AuthApi
from app.api.bookings import BookingsApi
from app.api.campus import CampusApi
from app.api.client import ApiClient, ApiError, ApiUnavailable, AuthRequired, Forbidden
from app.api.faq import FaqApi
from app.api.library import LibraryApi
from app.api.notifications import NotificationsApi
from app.api.privacy import PrivacyApi
from app.api.rooms import RoomsApi
from app.api.schedule import ScheduleApi

__all__ = [
    "ApiClient",
    "ApiError",
    "ApiUnavailable",
    "AuthRequired",
    "Forbidden",
    "AuthApi",
    "AIApi",
    "BookingsApi",
    "CampusApi",
    "FaqApi",
    "LibraryApi",
    "NotificationsApi",
    "PrivacyApi",
    "RoomsApi",
    "ScheduleApi",
]
