from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient, ApiError


class AnalyticsApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def attendance_policy(self, token: str) -> dict[str, Any]:
        return await self._client.get("/attendance/policy", token=token)

    async def my_attendance(self, token: str) -> dict[str, Any]:
        return await self._client.get("/attendance/my/analytics", token=token)

    async def attendance_students(
        self,
        token: str,
        group_name: str | None = None,
    ) -> list[dict[str, Any]]:
        try:
            data = await self._client.get(
                "/analytics/attendance/students",
                token=token,
                params={"groupName": group_name},
            )
        except ApiError as e:
            if e.status == 404:
                return _fake_attendance_students(group_name)
            raise
        items = _as_list(data)
        return items or _fake_attendance_students(group_name)

    async def summary(self, token: str) -> dict[str, Any]:
        return await self._client.get("/analytics/summary", token=token)


def _attendance_policy() -> dict[str, Any]:
    return {
        "maxSemesterPoints": 80,
        "admissionMinPoints": 60,
        "requiredRate": 0.75,
        "requiredPercent": 75,
        "absencePenaltyPoints": 5,
        "latePenaltyPoints": 2,
        "excusedPenaltyPoints": 0,
    }


def _fake_attendance_students(group_name: str | None = None) -> list[dict[str, Any]]:
    policy = _attendance_policy()
    group = group_name or "ИСИП-21"
    rows = [
        ("Анна Орлова", group, 6, 6, 0, 0, 0, 100.0, 80, 0, "admitted", 1),
        ("Тимур Сафин", group, 6, 3, 1, 2, 0, 83.3, 71, 9, "admitted", 1),
        ("Мария Белова", group, 6, 4, 0, 0, 2, 100.0, 80, 0, "admitted", 1),
        ("Никита Морозов", group, 6, 2, 3, 1, 0, 50.0, 63, 17, "attendance_risk", 0),
        ("Данил Волков", group, 6, 1, 4, 1, 0, 33.3, 58, 22, "not_admitted", 0),
    ]
    items: list[dict[str, Any]] = []
    for idx, (name, grp, total, present, absent, late, excused, percent, points, penalty, status, reserve) in enumerate(rows, 1):
        items.append(
            {
                "student": {
                    "id": f"demo-student-{idx}",
                    "fullName": name,
                    "role": "student",
                    "groupName": grp,
                    "department": "Computer Science",
                },
                "summary": {
                    "totalRecords": total,
                    "present": present,
                    "absent": absent,
                    "late": late,
                    "excused": excused,
                    "rate": percent / 100,
                },
                "policy": policy,
                "attendancePercent": percent,
                "currentPoints": points,
                "penaltyPoints": penalty,
                "rewardPoints": present * 3 + late + excused * 2,
                "pointsToAdmission": max(0, 60 - points),
                "admissionStatus": status,
                "remainingAbsencesBeforeRisk": reserve,
                "recommendation": "MVP demo data: обновите backend, чтобы получать реальные записи из базы.",
            }
        )
    return items
