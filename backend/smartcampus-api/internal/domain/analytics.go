package domain

type AnalyticsSummary struct {
	TotalUsers              int     `json:"totalUsers"`
	TotalBuildings          int     `json:"totalBuildings"`
	TotalRooms              int     `json:"totalRooms"`
	TotalBookings           int     `json:"totalBookings"`
	PendingBookings         int     `json:"pendingBookings"`
	ApprovedBookingsToday   int     `json:"approvedBookingsToday"`
	TotalNotificationsSent  int     `json:"totalNotificationsSent"`
	TotalAttendanceSessions int     `json:"totalAttendanceSessions"`
	AverageAttendanceRate   float64 `json:"averageAttendanceRate"`
	TotalBooks              int     `json:"totalBooks"`
	ActiveLibraryLoans      int     `json:"activeLibraryLoans"`
	AIQuestionsCount        int     `json:"aiQuestionsCount"`
	TelegramMessagesCount   int     `json:"telegramMessagesCount"`
}
