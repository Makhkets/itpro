package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/smartcampus/smartcampus-api/internal/config"
	"github.com/smartcampus/smartcampus-api/internal/domain"
	"github.com/smartcampus/smartcampus-api/internal/middleware"
	"github.com/smartcampus/smartcampus-api/internal/repository"
	"github.com/smartcampus/smartcampus-api/internal/response"
	"github.com/smartcampus/smartcampus-api/internal/security"
	"github.com/smartcampus/smartcampus-api/internal/service"
	"github.com/smartcampus/smartcampus-api/internal/validator"
)

type Handler struct {
	svc  *service.Service
	repo *repository.Repository
	cfg  config.Config
}

func New(svc *service.Service, repo *repository.Repository, cfg config.Config) *Handler {
	return &Handler{svc: svc, repo: repo, cfg: cfg}
}

func (h *Handler) RegisterRoutes(api *gin.RouterGroup, redisClient *redis.Client) {
	api.GET("/health", h.Health)
	api.POST("/auth/register", middleware.RateLimit(redisClient, "rate_limit:register", h.cfg.RateLimitRegisterPerMinute, time.Minute, false), h.Register)
	api.POST("/auth/login", middleware.RateLimit(redisClient, "rate_limit:login", h.cfg.RateLimitLoginPerMinute, time.Minute, false), h.Login)
	api.POST("/auth/isu-login", middleware.RateLimit(redisClient, "rate_limit:login", h.cfg.RateLimitLoginPerMinute, time.Minute, false), h.ISULogin)
	api.GET("/applicant-faq", h.ListFAQ)
	api.GET("/applicant-faq/search", h.SearchFAQ)

	protected := api.Group("")
	protected.Use(middleware.Auth(h.cfg.JWTSecret))
	protected.GET("/users/me", h.Me)
	protected.PATCH("/users/me/telegram", h.UpdateMyTelegram)
	protected.PATCH("/users/me/personal-data-consent", h.UpdateConsent)
	protected.GET("/privacy/me", h.PrivacyMe)
	protected.POST("/privacy/export", h.PrivacyExport)
	protected.POST("/privacy/delete-request", h.PrivacyDeleteRequest)

	protected.GET("/buildings", h.ListBuildings)
	protected.POST("/buildings", middleware.RequireRole("admin"), h.CreateBuilding)
	protected.GET("/buildings/:id", h.GetBuilding)
	protected.PATCH("/buildings/:id", middleware.RequireRole("admin"), h.UpdateBuilding)
	protected.GET("/buildings/:id/floors", h.ListFloors)
	protected.POST("/buildings/:id/floors", middleware.RequireRole("admin"), h.CreateFloor)

	protected.GET("/rooms/search", h.SearchRooms)
	protected.GET("/rooms", h.ListRooms)
	protected.GET("/rooms/:id", h.GetRoom)
	protected.POST("/rooms", middleware.RequireRole("admin"), h.CreateRoom)
	protected.PATCH("/rooms/:id", middleware.RequireRole("admin"), h.UpdateRoom)
	protected.GET("/navigation/room/:roomId", h.RoomNavigation)
	protected.GET("/navigation/routes", h.GetRoutes)
	protected.POST("/navigation/routes", middleware.RequireRole("admin"), h.CreateRoute)
	protected.PATCH("/navigation/routes/:id", middleware.RequireRole("admin"), h.UpdateRoute)

	protected.GET("/rooms/:id/schedule", h.RoomSchedule)
	protected.GET("/brs/my", h.MyBRS)
	protected.GET("/brs/profile", h.MyBRSProfile)
	protected.GET("/brs/specialization-avg", h.MyBRSSpecializationAvg)
	protected.GET("/brs/disciplines", h.MyBRSDisciplines)
	protected.GET("/brs/journal/:disciplineId", h.MyBRSJournal)
	protected.GET("/schedule/group/:groupName", h.GroupSchedule)
	protected.GET("/schedule/teacher/:teacherId", h.TeacherSchedule)
	protected.GET("/schedule/current", h.CurrentSchedule)
	protected.GET("/schedule/exam/group/:groupName", h.GroupExamSchedule)
	protected.GET("/schedule/exam/teacher/:teacherId", h.TeacherExamSchedule)
	protected.GET("/schedule/my", h.MyStudentSchedule)
	protected.GET("/schedule/my/exam", h.MyStudentExamSchedule)
	protected.GET("/schedule/teacher-my", h.MyTeacherScheduleHandler)
	protected.GET("/schedule/teacher-my/exam", h.MyTeacherExamScheduleHandler)
	protected.GET("/isu/institutes", h.ISUInstitutes)
	protected.GET("/isu/roles", h.MyISURoles)
	protected.GET("/isu/contracts", h.MyContracts)
	protected.GET("/isu/contracts/years", h.ContractsYears)
	protected.GET("/rooms/:id/availability", h.RoomAvailability)

	protected.POST("/bookings", h.CreateBooking)
	protected.GET("/bookings/my", h.MyBookings)
	protected.GET("/bookings", middleware.RequireRole("admin"), h.ListBookings)
	protected.GET("/bookings/:id", h.GetBooking)
	protected.PATCH("/bookings/:id/approve", middleware.RequireRole("admin"), h.ApproveBooking)
	protected.PATCH("/bookings/:id/reject", middleware.RequireRole("admin"), h.RejectBooking)
	protected.PATCH("/bookings/:id/cancel", h.CancelBooking)

	protected.GET("/notifications", h.ListNotifications)
	protected.PATCH("/notifications/:id/read", h.MarkNotificationRead)
	protected.PATCH("/notifications/read-all", h.MarkAllNotificationsRead)
	protected.POST("/telegram/link/start", h.StartTelegramLink)
	protected.POST("/telegram/link/verify", h.VerifyTelegramLink)

	protected.POST("/ai/chat", middleware.RateLimit(redisClient, "rate_limit:ai", h.cfg.RateLimitAIPerMinute, time.Minute, true), h.AIChat)
	protected.GET("/ai/sessions", h.ListAISessions)
	protected.GET("/ai/sessions/:id/messages", h.ListAIMessages)
	protected.DELETE("/ai/sessions/:id", h.DeleteAISession)

	protected.POST("/applicant-faq", middleware.RequireRole("admin"), h.CreateFAQ)
	protected.PATCH("/applicant-faq/:id", middleware.RequireRole("admin"), h.UpdateFAQ)
	protected.DELETE("/applicant-faq/:id", middleware.RequireRole("admin"), h.DeleteFAQ)

	protected.GET("/attendance/policy", h.AttendancePolicy)
	protected.GET("/attendance/my/analytics", middleware.RequireRole("student"), h.MyAttendanceAnalytics)
	protected.POST("/attendance/sessions", middleware.RequireRole("teacher", "admin"), h.CreateAttendanceSession)
	protected.GET("/attendance/sessions", middleware.RequireRole("teacher", "admin"), h.ListAttendanceSessions)
	protected.POST("/attendance/sessions/:id/records", middleware.RequireRole("teacher", "admin"), h.MarkAttendance)
	protected.GET("/attendance/sessions/:id/records", middleware.RequireRole("teacher", "admin"), h.ListAttendanceRecords)
	protected.GET("/attendance/my", middleware.RequireRole("student"), h.MyAttendance)
	protected.GET("/analytics/attendance/summary", middleware.RequireRole("admin"), h.AttendanceSummary)
	protected.GET("/analytics/attendance/by-group", middleware.RequireRole("teacher", "admin"), h.AttendanceByGroup)
	protected.GET("/analytics/attendance/students", middleware.RequireRole("teacher", "admin"), h.AttendanceStudentsAnalytics)
	protected.GET("/analytics/attendance/by-student/:studentId", h.AttendanceByStudent)

	protected.GET("/library/books/search", h.SearchBooks)
	protected.GET("/library/books/:id", h.GetBook)
	protected.POST("/library/books/:id/borrow", middleware.RequireRole("student", "teacher"), h.BorrowBook)
	protected.POST("/library/books", middleware.RequireRole("librarian", "admin"), h.CreateBook)
	protected.PATCH("/library/books/:id", middleware.RequireRole("librarian", "admin"), h.UpdateBook)
	protected.POST("/library/loans", middleware.RequireRole("librarian", "admin"), h.CreateLoan)
	protected.PATCH("/library/loans/:id/return", middleware.RequireRole("librarian", "admin"), h.ReturnLoan)
	protected.GET("/library/loans/my", middleware.RequireRole("student", "teacher"), h.MyLoans)
	protected.GET("/library/loans", middleware.RequireRole("librarian", "admin"), h.ListLoans)
	protected.GET("/analytics/library/summary", middleware.RequireRole("librarian", "admin"), h.LibrarySummary)

	protected.GET("/analytics/summary", middleware.RequireRole("admin"), h.AnalyticsSummary)
	protected.GET("/analytics/bookings-by-status", middleware.RequireRole("admin"), h.BookingsByStatus)
	protected.GET("/analytics/room-utilization", middleware.RequireRole("admin"), h.RoomUtilization)
	protected.GET("/analytics/telegram/summary", middleware.RequireRole("admin"), h.TelegramSummary)
	protected.GET("/analytics/ai/summary", middleware.RequireRole("admin"), h.AISummary)
	protected.GET("/audit-logs", middleware.RequireRole("admin"), h.AuditLogs)

	protected.GET("/security/dashboard", middleware.RequireRole("admin"), h.SecurityDashboard)
	protected.GET("/security/alerts", middleware.RequireRole("admin"), h.SecurityAlerts)
	protected.PATCH("/security/alerts/:id/resolve", middleware.RequireRole("admin"), h.ResolveSecurityAlert)
}

func (h *Handler) Health(c *gin.Context) {
	response.OK(c, gin.H{"status": "ok", "service": "SmartCampus MVP"})
}

func (h *Handler) SwaggerIndex(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, `<!doctype html><html><head><title>SmartCampus Swagger</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/docs/swagger.yaml',dom_id:'#swagger-ui'});</script></body></html>`)
}

func (h *Handler) Register(c *gin.Context) {
	var req service.RegisterRequest
	if !bind(c, &req) {
		return
	}
	if err := validateRegister(req); err != nil {
		response.WriteError(c, err)
		return
	}
	out, err := h.svc.Register(c.Request.Context(), req, meta(c))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	response.Created(c, out)
}

func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !bind(c, &req) {
		return
	}
	out, err := h.svc.Login(c.Request.Context(), req.Email, req.Password, meta(c))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	response.OK(c, out)
}

func (h *Handler) ISULogin(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !bind(c, &req) {
		return
	}
	if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
		response.WriteError(c, response.Validation("username and password are required", nil))
		return
	}
	out, err := h.svc.LoginISU(c.Request.Context(), req.Username, req.Password, meta(c))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	response.OK(c, out)
}

func (h *Handler) MyBRS(c *gin.Context) {
	yearStart := atoi(c.Query("yearStart"), time.Now().Year())
	yearEnd := atoi(c.Query("yearEnd"), time.Now().Year()+1)
	semester := atoi(c.Query("semester"), 1)
	out, err := h.svc.MyBRS(c.Request.Context(), c.GetString(middleware.ContextUserID), yearStart, yearEnd, semester)
	write(c, out, err)
}

func (h *Handler) MyBRSJournal(c *gin.Context) {
	disciplineID := atoi(c.Param("disciplineId"), 0)
	if disciplineID == 0 {
		response.WriteError(c, response.BadRequest("disciplineId is required", nil))
		return
	}
	yearStart := atoi(c.Query("yearStart"), time.Now().Year())
	yearEnd := atoi(c.Query("yearEnd"), time.Now().Year()+1)
	semester := atoi(c.Query("semester"), 1)
	out, err := h.svc.MyBRSJournal(c.Request.Context(), c.GetString(middleware.ContextUserID), disciplineID, yearStart, yearEnd, semester)
	write(c, out, err)
}

func (h *Handler) Me(c *gin.Context) {
	user, err := h.svc.GetMe(c.Request.Context(), c.GetString(middleware.ContextUserID))
	write(c, user, err)
}

func (h *Handler) UpdateMyTelegram(c *gin.Context) {
	var req struct {
		ChatID   int64  `json:"chatId"`
		Username string `json:"username"`
	}
	if !bind(c, &req) {
		return
	}
	m := meta(c)
	user, err := h.repo.GetUserByID(c.Request.Context(), m.UserID)
	if err != nil {
		response.WriteError(c, mapRepoErr(err))
		return
	}
	if !user.PersonalDataConsent {
		response.WriteError(c, response.Forbidden("Personal data consent is required for Telegram linking"))
		return
	}
	user, err = h.repo.UpdateUserTelegram(c.Request.Context(), m.UserID, req.ChatID, req.Username, true)
	if err == nil {
		_ = h.svc.Audit(c.Request.Context(), m, "telegram_link", "user", m.UserID, nil)
	}
	write(c, user, mapRepoErr(err))
}

func (h *Handler) UpdateConsent(c *gin.Context) {
	var req struct {
		Consent bool `json:"consent"`
	}
	if !bind(c, &req) {
		return
	}
	user, err := h.svc.UpdateConsent(c.Request.Context(), c.GetString(middleware.ContextUserID), req.Consent, meta(c))
	write(c, user, err)
}

func (h *Handler) ListBuildings(c *gin.Context) {
	items, err := h.svc.ListBuildings(c.Request.Context())
	write(c, items, err)
}

func (h *Handler) GetBuilding(c *gin.Context) {
	item, err := h.repo.GetBuilding(c.Request.Context(), c.Param("id"))
	write(c, item, mapRepoErr(err))
}

func (h *Handler) CreateBuilding(c *gin.Context) {
	var req repository.BuildingParams
	if !bind(c, &req) {
		return
	}
	if req.NavigationMode == "" {
		req.NavigationMode = "text"
	}
	req.IsActive = true
	item, err := h.svc.CreateBuilding(c.Request.Context(), req, meta(c))
	writeCreated(c, item, err)
}

func (h *Handler) UpdateBuilding(c *gin.Context) {
	var req repository.BuildingParams
	if !bind(c, &req) {
		return
	}
	item, err := h.svc.UpdateBuilding(c.Request.Context(), c.Param("id"), req, meta(c))
	write(c, item, err)
}

func (h *Handler) ListFloors(c *gin.Context) {
	items, err := h.svc.ListFloors(c.Request.Context(), c.Param("id"))
	write(c, items, err)
}

func (h *Handler) CreateFloor(c *gin.Context) {
	var req repository.FloorParams
	if !bind(c, &req) {
		return
	}
	req.BuildingID = c.Param("id")
	item, err := h.svc.CreateFloor(c.Request.Context(), req, meta(c))
	writeCreated(c, item, err)
}

func (h *Handler) SearchRooms(c *gin.Context) {
	filter := roomFilter(c)
	filter.Query = c.Query("q")
	items, err := h.svc.SearchRooms(c.Request.Context(), filter)
	write(c, items, err)
}

func (h *Handler) ListRooms(c *gin.Context) {
	items, err := h.svc.ListRooms(c.Request.Context(), roomFilter(c))
	write(c, items, err)
}

func (h *Handler) GetRoom(c *gin.Context) {
	item, err := h.repo.GetRoom(c.Request.Context(), c.Param("id"))
	write(c, item, mapRepoErr(err))
}

func (h *Handler) CreateRoom(c *gin.Context) {
	var req repository.RoomParams
	if !bind(c, &req) {
		return
	}
	if req.Type == "" {
		req.Type = "other"
	}
	req.IsActive = true
	req.IsBookable = true
	item, err := h.svc.CreateRoom(c.Request.Context(), req, meta(c))
	writeCreated(c, item, err)
}

func (h *Handler) UpdateRoom(c *gin.Context) {
	var req repository.RoomParams
	if !bind(c, &req) {
		return
	}
	item, err := h.svc.UpdateRoom(c.Request.Context(), c.Param("id"), req, meta(c))
	write(c, item, err)
}

func (h *Handler) RoomNavigation(c *gin.Context) {
	item, err := h.repo.RoomNavigation(c.Request.Context(), c.Param("roomId"))
	write(c, item, mapRepoErr(err))
}

func (h *Handler) GetRoutes(c *gin.Context) {
	items, err := h.repo.GetRoutes(c.Request.Context(), c.Query("fromBuildingId"), c.Query("toBuildingId"))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) CreateRoute(c *gin.Context) {
	var req repository.RouteParams
	if !bind(c, &req) {
		return
	}
	item, err := h.repo.CreateRoute(c.Request.Context(), req)
	if err == nil {
		_ = h.svc.Audit(c.Request.Context(), meta(c), "create_route", "campus_route", item.ID, nil)
	}
	writeCreated(c, item, mapRepoErr(err))
}

func (h *Handler) UpdateRoute(c *gin.Context) {
	var req repository.RouteParams
	if !bind(c, &req) {
		return
	}
	item, err := h.repo.UpdateRoute(c.Request.Context(), c.Param("id"), req)
	write(c, item, mapRepoErr(err))
}

// RoomSchedule returns schedule entries for a room. ISU has no per-room endpoint,
// so callers must pass ?group= to scope the lookup.
func (h *Handler) RoomSchedule(c *gin.Context) {
	from, to := rangeQuery(c)
	items, err := h.svc.RoomScheduleISU(c.Request.Context(), c.Param("id"), c.Query("group"), from, to)
	write(c, items, err)
}

func (h *Handler) GroupSchedule(c *gin.Context) {
	from, to := rangeQuery(c)
	items, err := h.svc.GroupScheduleISU(c.Request.Context(), c.Param("groupName"), from, to)
	write(c, items, err)
}

// TeacherSchedule accepts a teacher surname/name (ISU API filters by substring).
// The path param is named teacherId for backward compatibility.
func (h *Handler) TeacherSchedule(c *gin.Context) {
	from, to := rangeQuery(c)
	items, err := h.svc.TeacherScheduleISU(c.Request.Context(), c.Param("teacherId"), from, to)
	write(c, items, err)
}

func (h *Handler) CurrentSchedule(c *gin.Context) {
	group := c.Query("groupName")
	if group == "" {
		group = c.GetString(middleware.ContextGroupName)
	}
	item, err := h.svc.CurrentScheduleISU(c.Request.Context(), group, time.Now())
	write(c, item, err)
}

// GroupExamSchedule returns exam schedule entries for a group.
func (h *Handler) GroupExamSchedule(c *gin.Context) {
	from, to := rangeQuery(c)
	items, err := h.svc.GroupExamScheduleISU(c.Request.Context(), c.Param("groupName"), from, to)
	write(c, items, err)
}

// TeacherExamSchedule returns exam schedule entries for a teacher.
func (h *Handler) TeacherExamSchedule(c *gin.Context) {
	from, to := rangeQuery(c)
	items, err := h.svc.TeacherExamScheduleISU(c.Request.Context(), c.Param("teacherId"), from, to)
	write(c, items, err)
}

// ISUInstitutes returns the list of ISU institutes (public data).
func (h *Handler) ISUInstitutes(c *gin.Context) {
	data, err := h.svc.ISUInstitutes(c.Request.Context())
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyStudentSchedule returns the authenticated student's personal ISU timetable.
func (h *Handler) MyStudentSchedule(c *gin.Context) {
	data, err := h.svc.MyStudentSchedule(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyStudentExamSchedule returns the authenticated student's exam schedule.
func (h *Handler) MyStudentExamSchedule(c *gin.Context) {
	data, err := h.svc.MyStudentExamSchedule(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyBRSProfile returns the authenticated student's BRS profile.
func (h *Handler) MyBRSProfile(c *gin.Context) {
	yearStart := atoi(c.Query("yearStart"), time.Now().Year())
	yearEnd := atoi(c.Query("yearEnd"), time.Now().Year()+1)
	semester := atoi(c.Query("semester"), 1)
	data, err := h.svc.MyBRSProfile(c.Request.Context(), c.GetString(middleware.ContextUserID), yearStart, yearEnd, semester)
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyBRSSpecializationAvg returns the authenticated student's BRS specialization average.
func (h *Handler) MyBRSSpecializationAvg(c *gin.Context) {
	yearStart := atoi(c.Query("yearStart"), time.Now().Year())
	yearEnd := atoi(c.Query("yearEnd"), time.Now().Year()+1)
	semester := atoi(c.Query("semester"), 1)
	data, err := h.svc.MyBRSSpecializationAvg(c.Request.Context(), c.GetString(middleware.ContextUserID), yearStart, yearEnd, semester)
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyBRSDisciplines returns the authenticated student's BRS disciplines.
func (h *Handler) MyBRSDisciplines(c *gin.Context) {
	yearStart := atoi(c.Query("yearStart"), time.Now().Year())
	yearEnd := atoi(c.Query("yearEnd"), time.Now().Year()+1)
	semester := atoi(c.Query("semester"), 1)
	data, err := h.svc.MyBRSDisciplines(c.Request.Context(), c.GetString(middleware.ContextUserID), yearStart, yearEnd, semester)
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyTeacherScheduleHandler returns the authenticated teacher's ISU timetable.
func (h *Handler) MyTeacherScheduleHandler(c *gin.Context) {
	data, err := h.svc.MyTeacherSchedule(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyTeacherExamScheduleHandler returns the authenticated teacher's ISU exam schedule.
func (h *Handler) MyTeacherExamScheduleHandler(c *gin.Context) {
	data, err := h.svc.MyTeacherExamSchedule(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyContracts returns the authenticated user's ISU contracts.
func (h *Handler) MyContracts(c *gin.Context) {
	data, err := h.svc.MyContracts(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// ContractsYears returns available contract years from ISU.
func (h *Handler) ContractsYears(c *gin.Context) {
	data, err := h.svc.ContractsYears(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

// MyISURoles returns the authenticated user's ISU roles.
func (h *Handler) MyISURoles(c *gin.Context) {
	data, err := h.svc.MyISURoles(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	c.Data(200, "application/json; charset=utf-8", data)
}

func (h *Handler) RoomAvailability(c *gin.Context) {
	date := time.Now()
	if c.Query("date") != "" {
		parsed, err := time.Parse("2006-01-02", c.Query("date"))
		if err != nil {
			response.WriteError(c, response.Validation("Invalid date format", gin.H{"expected": "YYYY-MM-DD"}))
			return
		}
		date = parsed
	}
	item, err := h.svc.RoomAvailability(c.Request.Context(), c.Param("id"), date)
	write(c, item, err)
}

func (h *Handler) CreateBooking(c *gin.Context) {
	var req repository.BookingParams
	if !bind(c, &req) {
		return
	}
	req.RequestedBy = c.GetString(middleware.ContextUserID)
	item, err := h.svc.CreateBooking(c.Request.Context(), req, meta(c))
	writeCreated(c, item, err)
}

func (h *Handler) MyBookings(c *gin.Context) {
	items, err := h.repo.ListMyBookings(c.Request.Context(), c.GetString(middleware.ContextUserID), c.Query("status"), page(c), pageSize(c))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) ListBookings(c *gin.Context) {
	items, err := h.repo.ListBookings(c.Request.Context(), c.Query("status"), c.Query("roomId"), page(c), pageSize(c))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) GetBooking(c *gin.Context) {
	item, err := h.repo.GetBooking(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.WriteError(c, mapRepoErr(err))
		return
	}
	m := meta(c)
	if m.Role != "admin" && item.RequestedBy != m.UserID {
		response.WriteError(c, response.Forbidden("Cannot read another user's booking"))
		return
	}
	response.OK(c, item)
}

func (h *Handler) ApproveBooking(c *gin.Context) {
	var req struct {
		Comment string `json:"comment"`
	}
	_ = c.ShouldBindJSON(&req)
	item, err := h.svc.ApproveBooking(c.Request.Context(), c.Param("id"), req.Comment, meta(c))
	write(c, item, err)
}

func (h *Handler) RejectBooking(c *gin.Context) {
	var req struct {
		Comment string `json:"comment"`
	}
	_ = c.ShouldBindJSON(&req)
	item, err := h.svc.RejectBooking(c.Request.Context(), c.Param("id"), req.Comment, meta(c))
	write(c, item, err)
}

func (h *Handler) CancelBooking(c *gin.Context) {
	item, err := h.svc.CancelBooking(c.Request.Context(), c.Param("id"), meta(c))
	write(c, item, err)
}

func (h *Handler) ListNotifications(c *gin.Context) {
	items, err := h.repo.ListNotifications(c.Request.Context(), c.GetString(middleware.ContextUserID), c.Query("unreadOnly") == "true", page(c), pageSize(c))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) MarkNotificationRead(c *gin.Context) {
	err := h.repo.MarkNotificationRead(c.Request.Context(), c.GetString(middleware.ContextUserID), c.Param("id"))
	if err != nil {
		response.WriteError(c, mapRepoErr(err))
		return
	}
	response.OK(c, gin.H{"ok": true})
}

func (h *Handler) MarkAllNotificationsRead(c *gin.Context) {
	err := h.repo.MarkAllNotificationsRead(c.Request.Context(), c.GetString(middleware.ContextUserID))
	write(c, gin.H{"ok": true}, mapRepoErr(err))
}

func (h *Handler) StartTelegramLink(c *gin.Context) {
	out, err := h.svc.StartTelegramLink(c.Request.Context(), meta(c))
	write(c, out, err)
}

func (h *Handler) VerifyTelegramLink(c *gin.Context) {
	var req struct {
		Code     string `json:"code"`
		ChatID   int64  `json:"chatId"`
		Username string `json:"username"`
	}
	if !bind(c, &req) {
		return
	}
	user, err := h.svc.VerifyTelegramLink(c.Request.Context(), c.GetString(middleware.ContextUserID), req.Code, req.ChatID, req.Username, meta(c))
	write(c, user, err)
}

func (h *Handler) AIChat(c *gin.Context) {
	var req struct {
		SessionID string `json:"sessionId"`
		Message   string `json:"message"`
	}
	if !bind(c, &req) {
		return
	}
	if len([]rune(strings.TrimSpace(req.Message))) == 0 || len([]rune(req.Message)) > 2000 {
		response.WriteError(c, response.Validation("message must be 1-2000 chars", nil))
		return
	}
	out, err := h.svc.AIChat(c.Request.Context(), c.GetString(middleware.ContextUserID), c.GetBool(middleware.ContextConsent), req.SessionID, req.Message, meta(c))
	write(c, out, err)
}

func (h *Handler) ListAISessions(c *gin.Context) {
	items, err := h.repo.ListAISessions(c.Request.Context(), c.GetString(middleware.ContextUserID))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) ListAIMessages(c *gin.Context) {
	items, err := h.repo.ListAIMessages(c.Request.Context(), c.GetString(middleware.ContextUserID), c.Param("id"))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) DeleteAISession(c *gin.Context) {
	err := h.repo.DeleteAISession(c.Request.Context(), c.GetString(middleware.ContextUserID), c.Param("id"))
	if err != nil {
		response.WriteError(c, mapRepoErr(err))
		return
	}
	response.NoContent(c)
}

func (h *Handler) ListFAQ(c *gin.Context) {
	items, err := h.repo.ListFAQ(c.Request.Context())
	write(c, items, mapRepoErr(err))
}

func (h *Handler) SearchFAQ(c *gin.Context) {
	items, err := h.repo.SearchFAQ(c.Request.Context(), c.Query("q"))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) CreateFAQ(c *gin.Context) {
	var req repository.FAQParams
	if !bind(c, &req) {
		return
	}
	req.IsActive = true
	item, err := h.repo.CreateFAQ(c.Request.Context(), req)
	writeCreated(c, item, mapRepoErr(err))
}

func (h *Handler) UpdateFAQ(c *gin.Context) {
	var req repository.FAQParams
	if !bind(c, &req) {
		return
	}
	item, err := h.repo.UpdateFAQ(c.Request.Context(), c.Param("id"), req)
	write(c, item, mapRepoErr(err))
}

func (h *Handler) DeleteFAQ(c *gin.Context) {
	err := h.repo.DeleteFAQ(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.WriteError(c, mapRepoErr(err))
		return
	}
	response.NoContent(c)
}

func (h *Handler) AttendancePolicy(c *gin.Context) {
	response.OK(c, h.svc.AttendancePolicy())
}

func (h *Handler) MyAttendanceAnalytics(c *gin.Context) {
	item, err := h.svc.MyAttendanceAnalytics(c.Request.Context(), meta(c))
	write(c, item, err)
}

func (h *Handler) CreateAttendanceSession(c *gin.Context) {
	var req repository.AttendanceSessionParams
	if !bind(c, &req) {
		return
	}
	if c.GetString(middleware.ContextRole) == "teacher" {
		req.TeacherID = c.GetString(middleware.ContextUserID)
	}
	item, err := h.repo.CreateAttendanceSession(c.Request.Context(), req)
	writeCreated(c, item, mapRepoErr(err))
}

func (h *Handler) ListAttendanceSessions(c *gin.Context) {
	from, to := rangeQuery(c)
	items, err := h.repo.ListAttendanceSessions(c.Request.Context(), from, to)
	write(c, items, mapRepoErr(err))
}

func (h *Handler) MarkAttendance(c *gin.Context) {
	var req struct {
		Records []repository.AttendanceRecordParams `json:"records"`
	}
	if !bind(c, &req) {
		return
	}
	items, err := h.svc.CreateAttendanceRecords(c.Request.Context(), c.Param("id"), req.Records, meta(c))
	write(c, items, err)
}

func (h *Handler) ListAttendanceRecords(c *gin.Context) {
	items, err := h.repo.ListAttendanceRecords(c.Request.Context(), c.Param("id"))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) MyAttendance(c *gin.Context) {
	items, err := h.repo.ListMyAttendance(c.Request.Context(), c.GetString(middleware.ContextUserID))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) AttendanceSummary(c *gin.Context) {
	item, err := h.repo.AttendanceSummary(c.Request.Context(), "", "")
	write(c, item, mapRepoErr(err))
}

func (h *Handler) AttendanceByGroup(c *gin.Context) {
	item, err := h.repo.AttendanceSummary(c.Request.Context(), c.Query("groupName"), "")
	write(c, item, mapRepoErr(err))
}

func (h *Handler) AttendanceStudentsAnalytics(c *gin.Context) {
	items, err := h.svc.AttendanceStudentsAnalytics(c.Request.Context(), c.Query("groupName"))
	write(c, items, err)
}

func (h *Handler) AttendanceByStudent(c *gin.Context) {
	m := meta(c)
	if !security.RoleAllowed(m.Role, "admin", "teacher", "student") {
		response.WriteError(c, response.Forbidden("Insufficient permissions"))
		return
	}
	item, err := h.svc.AttendanceByStudent(c.Request.Context(), c.Param("studentId"), m)
	write(c, item, err)
}

func (h *Handler) SearchBooks(c *gin.Context) {
	items, err := h.repo.SearchBooks(c.Request.Context(), c.Query("q"), c.Query("author"), c.Query("category"))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) GetBook(c *gin.Context) {
	item, err := h.repo.GetBook(c.Request.Context(), c.Param("id"))
	write(c, item, mapRepoErr(err))
}

func (h *Handler) CreateBook(c *gin.Context) {
	var req repository.LibraryBookParams
	if !bind(c, &req) {
		return
	}
	item, err := h.repo.CreateBook(c.Request.Context(), req)
	writeCreated(c, item, mapRepoErr(err))
}

func (h *Handler) UpdateBook(c *gin.Context) {
	var req repository.LibraryBookParams
	if !bind(c, &req) {
		return
	}
	item, err := h.repo.UpdateBook(c.Request.Context(), c.Param("id"), req)
	write(c, item, mapRepoErr(err))
}

func (h *Handler) BorrowBook(c *gin.Context) {
	var req struct {
		DueAt time.Time `json:"dueAt"`
	}
	if c.Request.ContentLength > 0 && !bind(c, &req) {
		return
	}
	item, err := h.svc.BorrowLibraryBook(c.Request.Context(), c.Param("id"), req.DueAt, meta(c))
	writeCreated(c, item, err)
}

func (h *Handler) CreateLoan(c *gin.Context) {
	var req struct {
		BookID string    `json:"bookId"`
		UserID string    `json:"userId"`
		DueAt  time.Time `json:"dueAt"`
	}
	if !bind(c, &req) {
		return
	}
	item, err := h.svc.CreateLibraryLoan(c.Request.Context(), req.BookID, req.UserID, req.DueAt, meta(c))
	writeCreated(c, item, err)
}

func (h *Handler) ReturnLoan(c *gin.Context) {
	item, err := h.repo.ReturnLoan(c.Request.Context(), c.Param("id"), c.GetString(middleware.ContextUserID))
	write(c, item, mapRepoErr(err))
}

func (h *Handler) MyLoans(c *gin.Context) {
	items, err := h.repo.MyLoans(c.Request.Context(), c.GetString(middleware.ContextUserID))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) ListLoans(c *gin.Context) {
	items, err := h.repo.ListLoans(c.Request.Context(), c.Query("status"))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) LibrarySummary(c *gin.Context) {
	item, err := h.repo.LibrarySummary(c.Request.Context())
	write(c, item, mapRepoErr(err))
}

func (h *Handler) AnalyticsSummary(c *gin.Context) {
	item, err := h.repo.AnalyticsSummary(c.Request.Context())
	write(c, item, mapRepoErr(err))
}

func (h *Handler) BookingsByStatus(c *gin.Context) {
	item, err := h.repo.BookingsByStatus(c.Request.Context())
	write(c, item, mapRepoErr(err))
}

func (h *Handler) RoomUtilization(c *gin.Context) {
	item, err := h.repo.RoomUtilization(c.Request.Context())
	write(c, item, mapRepoErr(err))
}

func (h *Handler) TelegramSummary(c *gin.Context) {
	count, err := h.repo.CountTelegramLinks(c.Request.Context())
	write(c, gin.H{"verifiedTelegramLinks": count}, mapRepoErr(err))
}

func (h *Handler) AISummary(c *gin.Context) {
	count, err := h.repo.CountAIQuestions(c.Request.Context())
	write(c, gin.H{"aiQuestionsCount": count}, mapRepoErr(err))
}

func (h *Handler) AuditLogs(c *gin.Context) {
	items, err := h.repo.ListAuditLogs(c.Request.Context(), page(c), pageSize(c))
	write(c, items, mapRepoErr(err))
}

func (h *Handler) SecurityDashboard(c *gin.Context) {
	item, err := h.repo.SecurityDashboard(c.Request.Context())
	write(c, item, mapRepoErr(err))
}

func (h *Handler) SecurityAlerts(c *gin.Context) {
	onlyUnresolved := c.Query("unresolved") == "true"
	items, err := h.repo.ListSecurityAlerts(c.Request.Context(), page(c), pageSize(c), onlyUnresolved)
	write(c, items, mapRepoErr(err))
}

func (h *Handler) ResolveSecurityAlert(c *gin.Context) {
	err := h.repo.ResolveSecurityAlert(c.Request.Context(), c.Param("id"), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, mapRepoErr(err))
		return
	}
	response.OK(c, gin.H{"ok": true})
}

func (h *Handler) PrivacyMe(c *gin.Context) {
	user, err := h.svc.GetMe(c.Request.Context(), c.GetString(middleware.ContextUserID))
	if err != nil {
		response.WriteError(c, err)
		return
	}
	response.OK(c, gin.H{
		"storedPersonalData": []string{"fullName", "email", "role", "groupName", "department", "telegramChatId", "telegramUsername", "attendance", "bookings", "libraryLoans", "aiChatMessages"},
		"user":               user,
	})
}

func (h *Handler) PrivacyExport(c *gin.Context) {
	out, err := h.svc.PrivacyExport(c.Request.Context(), c.GetString(middleware.ContextUserID))
	write(c, out, err)
}

func (h *Handler) PrivacyDeleteRequest(c *gin.Context) {
	err := h.svc.PrivacyDeleteRequest(c.Request.Context(), meta(c))
	write(c, gin.H{"ok": true, "status": "delete_request_created"}, err)
}

func bind(c *gin.Context, dest any) bool {
	if err := c.ShouldBindJSON(dest); err != nil {
		response.WriteError(c, response.Validation("Invalid request body", gin.H{"error": err.Error()}))
		return false
	}
	return true
}

func write(c *gin.Context, value any, err error) {
	if err != nil {
		response.WriteError(c, err)
		return
	}
	response.OK(c, value)
}

func writeCreated(c *gin.Context, value any, err error) {
	if err != nil {
		response.WriteError(c, err)
		return
	}
	response.Created(c, value)
}

func mapRepoErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, repository.ErrNotFound) {
		return response.NotFound("Resource not found")
	}
	if errors.Is(err, repository.ErrConflict) {
		return response.Conflict("Resource conflict")
	}
	return response.Internal("Internal server error")
}

func meta(c *gin.Context) service.RequestMeta {
	return service.RequestMeta{
		UserID:              c.GetString(middleware.ContextUserID),
		Email:               c.GetString(middleware.ContextEmail),
		Role:                c.GetString(middleware.ContextRole),
		GroupName:           c.GetString(middleware.ContextGroupName),
		PersonalDataConsent: c.GetBool(middleware.ContextConsent),
		IP:                  c.ClientIP(),
		UserAgent:           c.Request.UserAgent(),
	}
}

func validateRegister(req service.RegisterRequest) error {
	if len([]rune(strings.TrimSpace(req.FullName))) < 2 || len([]rune(req.FullName)) > 255 {
		return response.Validation("fullName must be 2-255 chars", nil)
	}
	if len(req.Email) > 255 || !strings.Contains(req.Email, "@") {
		return response.Validation("email must be valid", nil)
	}
	if len(req.Password) < 8 {
		return response.Validation("password must be at least 8 chars", nil)
	}
	if !validator.ValidRole(req.Role) {
		return response.Validation("invalid role", nil)
	}
	return nil
}

func roomFilter(c *gin.Context) domain.RoomSearchFilter {
	return domain.RoomSearchFilter{
		BuildingID:  c.Query("buildingId"),
		FloorID:     c.Query("floorId"),
		Type:        c.Query("type"),
		Equipment:   c.Query("equipment"),
		CapacityMin: atoi(c.Query("capacityMin"), 0),
		Page:        page(c),
		PageSize:    pageSize(c),
	}
}

func rangeQuery(c *gin.Context) (time.Time, time.Time) {
	now := time.Now()
	from := now.Add(-24 * time.Hour)
	to := now.Add(7 * 24 * time.Hour)
	if c.Query("from") != "" {
		if parsed, err := time.Parse(time.RFC3339, c.Query("from")); err == nil {
			from = parsed
		}
	}
	if c.Query("to") != "" {
		if parsed, err := time.Parse(time.RFC3339, c.Query("to")); err == nil {
			to = parsed
		}
	}
	return from, to
}

func page(c *gin.Context) int {
	return atoi(c.Query("page"), 1)
}

func pageSize(c *gin.Context) int {
	size := atoi(c.Query("pageSize"), 20)
	if size > 100 {
		return 100
	}
	if size < 1 {
		return 20
	}
	return size
}

func atoi(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}
