package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/smartcampus/smartcampus-api/internal/config"
	"github.com/smartcampus/smartcampus-api/internal/domain"
	"github.com/smartcampus/smartcampus-api/internal/repository"
	"github.com/smartcampus/smartcampus-api/internal/response"
	"github.com/smartcampus/smartcampus-api/internal/security"
	"github.com/smartcampus/smartcampus-api/pkg/logger"
)

type Service struct {
	repo  *repository.Repository
	redis *redis.Client
	cfg   config.Config
	log   *logger.Logger
	http  *http.Client
}

type RequestMeta struct {
	UserID              string
	Email               string
	Role                string
	GroupName           string
	PersonalDataConsent bool
	IP                  string
	UserAgent           string
}

type AuthResult struct {
	User  domain.User `json:"user"`
	Token string      `json:"token"`
}

type ConsentResult struct {
	domain.User
	Token string `json:"token"`
}

type RegisterRequest struct {
	FullName   string `json:"fullName"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	Role       string `json:"role"`
	GroupName  string `json:"groupName"`
	Department string `json:"department"`
}

func New(repo *repository.Repository, redisClient *redis.Client, cfg config.Config, log *logger.Logger) *Service {
	return &Service{
		repo:  repo,
		redis: redisClient,
		cfg:   cfg,
		log:   log,
		http:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest, meta RequestMeta) (AuthResult, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Role = strings.TrimSpace(req.Role)
	if req.Role == "admin" && !s.cfg.AllowPublicAdminRegister {
		return AuthResult{}, response.Forbidden("Public admin registration is disabled")
	}
	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return AuthResult{}, response.Internal("Could not hash password")
	}
	user, err := s.repo.CreateUser(ctx, repository.CreateUserParams{
		FullName: req.FullName, Email: req.Email, PasswordHash: hash, Role: req.Role,
		GroupName: req.GroupName, Department: req.Department,
	})
	if err != nil {
		return AuthResult{}, mapRepoErr(err)
	}
	_ = s.Audit(ctx, RequestMeta{UserID: user.ID, IP: meta.IP, UserAgent: meta.UserAgent}, "register", "user", user.ID, nil)
	token, err := s.tokenForUser(user)
	if err != nil {
		return AuthResult{}, response.Internal("Could not issue token")
	}
	return AuthResult{User: user, Token: token}, nil
}

func (s *Service) Login(ctx context.Context, email, password string, meta RequestMeta) (AuthResult, error) {
	user, err := s.repo.GetUserByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		_ = s.Audit(ctx, meta, "failed_login", "user", "", map[string]any{"email": security.MaskPII(email)})
		return AuthResult{}, response.Unauthorized("Invalid email or password")
	}
	if !security.CheckPassword(password, user.PasswordHash) {
		_ = s.Audit(ctx, RequestMeta{UserID: user.ID, IP: meta.IP, UserAgent: meta.UserAgent}, "failed_login", "user", user.ID, nil)
		return AuthResult{}, response.Unauthorized("Invalid email or password")
	}
	_ = s.Audit(ctx, RequestMeta{UserID: user.ID, IP: meta.IP, UserAgent: meta.UserAgent}, "login", "user", user.ID, nil)
	token, err := s.tokenForUser(user)
	if err != nil {
		return AuthResult{}, response.Internal("Could not issue token")
	}
	return AuthResult{User: user, Token: token}, nil
}

func (s *Service) UpdateConsent(ctx context.Context, userID string, consent bool, meta RequestMeta) (ConsentResult, error) {
	user, err := s.repo.UpdateConsent(ctx, userID, consent)
	if err != nil {
		return ConsentResult{}, mapRepoErr(err)
	}
	token, err := s.tokenForUser(user)
	if err != nil {
		return ConsentResult{}, response.Internal("Could not issue token")
	}
	_ = s.repo.CreatePersonalDataEvent(ctx, userID, "personal_data_consent_update", fmt.Sprintf("Personal data consent set to %t", consent))
	_ = s.Audit(ctx, meta, "personal_data_consent_update", "user", userID, map[string]any{"consent": consent})
	return ConsentResult{User: user, Token: token}, nil
}

func (s *Service) tokenForUser(user domain.User) (string, error) {
	return security.GenerateJWT(s.cfg.JWTSecret, s.cfg.JWTAccessTTL, security.Claims{
		UserID: user.ID, Email: user.Email, Role: user.Role, GroupName: user.GroupName,
		PersonalDataConsent: user.PersonalDataConsent,
	})
}

func (s *Service) GetMe(ctx context.Context, userID string) (domain.User, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return domain.User{}, mapRepoErr(err)
	}
	return user, nil
}

func (s *Service) Audit(ctx context.Context, meta RequestMeta, action, entityType, entityID string, metadata map[string]any) error {
	if metadata == nil {
		metadata = map[string]any{}
	}
	return s.repo.CreateAuditLog(ctx, repository.AuditParams{
		UserID: meta.UserID, Action: action, EntityType: entityType, EntityID: entityID,
		IPAddress: meta.IP, UserAgent: meta.UserAgent, Metadata: metadata,
	})
}

func (s *Service) ListBuildings(ctx context.Context) ([]domain.Building, error) {
	const key = "cache:buildings:list"
	var cached []domain.Building
	if s.getCache(ctx, key, &cached) {
		return cached, nil
	}
	items, err := s.repo.ListBuildings(ctx)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	s.setCache(ctx, key, items, 10*time.Minute)
	return items, nil
}

func (s *Service) CreateBuilding(ctx context.Context, p repository.BuildingParams, meta RequestMeta) (domain.Building, error) {
	item, err := s.repo.CreateBuilding(ctx, p)
	if err != nil {
		return domain.Building{}, mapRepoErr(err)
	}
	s.deleteCache(ctx, "cache:buildings:list")
	_ = s.Audit(ctx, meta, "create_building", "building", item.ID, nil)
	return item, nil
}

func (s *Service) UpdateBuilding(ctx context.Context, id string, p repository.BuildingParams, meta RequestMeta) (domain.Building, error) {
	item, err := s.repo.UpdateBuilding(ctx, id, p)
	if err != nil {
		return domain.Building{}, mapRepoErr(err)
	}
	s.deleteCache(ctx, "cache:buildings:list")
	_ = s.Audit(ctx, meta, "update_building", "building", item.ID, nil)
	return item, nil
}

func (s *Service) ListFloors(ctx context.Context, buildingID string) ([]domain.Floor, error) {
	key := "cache:floors:building:" + buildingID
	var cached []domain.Floor
	if s.getCache(ctx, key, &cached) {
		return cached, nil
	}
	items, err := s.repo.ListFloors(ctx, buildingID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	s.setCache(ctx, key, items, 10*time.Minute)
	return items, nil
}

func (s *Service) CreateFloor(ctx context.Context, p repository.FloorParams, meta RequestMeta) (domain.Floor, error) {
	item, err := s.repo.CreateFloor(ctx, p)
	if err != nil {
		return domain.Floor{}, mapRepoErr(err)
	}
	s.deleteCache(ctx, "cache:floors:building:"+p.BuildingID)
	_ = s.Audit(ctx, meta, "create_floor", "floor", item.ID, nil)
	return item, nil
}

func (s *Service) ListRooms(ctx context.Context, filter domain.RoomSearchFilter) ([]domain.Room, error) {
	key := "cache:rooms:building:" + filter.BuildingID
	if filter.FloorID == "" && filter.Type == "" && filter.Query == "" && filter.BuildingID != "" {
		var cached []domain.Room
		if s.getCache(ctx, key, &cached) {
			return cached, nil
		}
		items, err := s.repo.ListRooms(ctx, filter)
		if err != nil {
			return nil, mapRepoErr(err)
		}
		s.setCache(ctx, key, items, 5*time.Minute)
		return items, nil
	}
	items, err := s.repo.ListRooms(ctx, filter)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	return items, nil
}

func (s *Service) SearchRooms(ctx context.Context, filter domain.RoomSearchFilter) ([]domain.Room, error) {
	items, err := s.repo.SearchRooms(ctx, filter)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	return items, nil
}

func (s *Service) CreateRoom(ctx context.Context, p repository.RoomParams, meta RequestMeta) (domain.Room, error) {
	item, err := s.repo.CreateRoom(ctx, p)
	if err != nil {
		return domain.Room{}, mapRepoErr(err)
	}
	s.deleteCache(ctx, "cache:rooms:building:"+p.BuildingID)
	_ = s.Audit(ctx, meta, "create_room", "room", item.ID, nil)
	return item, nil
}

func (s *Service) UpdateRoom(ctx context.Context, id string, p repository.RoomParams, meta RequestMeta) (domain.Room, error) {
	item, err := s.repo.UpdateRoom(ctx, id, p)
	if err != nil {
		return domain.Room{}, mapRepoErr(err)
	}
	s.deleteCache(ctx, "cache:rooms:building:"+p.BuildingID)
	_ = s.Audit(ctx, meta, "update_room", "room", item.ID, nil)
	return item, nil
}

func (s *Service) RoomAvailability(ctx context.Context, roomID string, date time.Time) (domain.RoomAvailability, error) {
	start := time.Date(date.Year(), date.Month(), date.Day(), 8, 0, 0, 0, date.Location())
	end := time.Date(date.Year(), date.Month(), date.Day(), 20, 0, 0, 0, date.Location())
	busy, err := s.repo.BusySlots(ctx, roomID, start, end)
	if err != nil {
		return domain.RoomAvailability{}, mapRepoErr(err)
	}
	free := buildFreeSlots(start, end, busy)
	return domain.RoomAvailability{
		Date: start.Format("2006-01-02"), WorkingFrom: "08:00", WorkingTo: "20:00",
		BusySlots: busy, FreeSlots: free,
	}, nil
}

func (s *Service) CreateBooking(ctx context.Context, p repository.BookingParams, meta RequestMeta) (domain.Booking, error) {
	room, err := s.repo.GetRoom(ctx, p.RoomID)
	if err != nil {
		return domain.Booking{}, mapRepoErr(err)
	}
	if !room.IsActive {
		return domain.Booking{}, response.BadRequest("Room is inactive", nil)
	}
	if !room.IsBookable {
		return domain.Booking{}, response.BadRequest("Room is not bookable", nil)
	}
	if p.StartsAt.Before(time.Now()) {
		return domain.Booking{}, response.BadRequest("Cannot book in the past", nil)
	}
	if !p.EndsAt.After(p.StartsAt) {
		return domain.Booking{}, response.Validation("endsAt must be after startsAt", nil)
	}
	if p.EndsAt.Sub(p.StartsAt) > 8*time.Hour {
		return domain.Booking{}, response.Validation("Booking duration cannot exceed 8 hours", nil)
	}
	booking, err := s.repo.CreateBooking(ctx, p)
	if err != nil {
		return domain.Booking{}, mapRepoErr(err)
	}
	_ = s.Audit(ctx, meta, "create_booking", "booking", booking.ID, nil)
	return booking, nil
}

func (s *Service) ApproveBooking(ctx context.Context, id, comment string, meta RequestMeta) (domain.Booking, error) {
	booking, err := s.repo.GetBooking(ctx, id)
	if err != nil {
		return domain.Booking{}, mapRepoErr(err)
	}
	if booking.Status != "pending" {
		return domain.Booking{}, response.Conflict("Only pending bookings can be approved")
	}
	if exists, err := s.repo.HasScheduleOverlap(ctx, booking.RoomID, booking.StartsAt, booking.EndsAt); err != nil {
		return domain.Booking{}, mapRepoErr(err)
	} else if exists {
		return domain.Booking{}, response.Conflict("Booking conflicts with schedule")
	}
	if exists, err := s.repo.HasApprovedBookingOverlap(ctx, booking.RoomID, booking.ID, booking.StartsAt, booking.EndsAt); err != nil {
		return domain.Booking{}, mapRepoErr(err)
	} else if exists {
		return domain.Booking{}, response.Conflict("Booking conflicts with another approved booking")
	}
	updated, err := s.repo.UpdateBookingStatus(ctx, id, "approved", comment, meta.UserID)
	if err != nil {
		return domain.Booking{}, mapRepoErr(err)
	}
	_ = s.notifyBooking(ctx, updated, "booking_approved", "Бронирование подтверждено", "Ваша заявка на бронирование подтверждена.")
	_ = s.Audit(ctx, meta, "approve_booking", "booking", updated.ID, nil)
	return updated, nil
}

func (s *Service) RejectBooking(ctx context.Context, id, comment string, meta RequestMeta) (domain.Booking, error) {
	booking, err := s.repo.UpdateBookingStatus(ctx, id, "rejected", comment, meta.UserID)
	if err != nil {
		return domain.Booking{}, mapRepoErr(err)
	}
	_ = s.notifyBooking(ctx, booking, "booking_rejected", "Бронирование отклонено", "Ваша заявка на бронирование отклонена.")
	_ = s.Audit(ctx, meta, "reject_booking", "booking", booking.ID, nil)
	return booking, nil
}

func (s *Service) CancelBooking(ctx context.Context, id string, meta RequestMeta) (domain.Booking, error) {
	booking, err := s.repo.GetBooking(ctx, id)
	if err != nil {
		return domain.Booking{}, mapRepoErr(err)
	}
	if meta.Role != "admin" && booking.RequestedBy != meta.UserID {
		return domain.Booking{}, response.Forbidden("Cannot cancel another user's booking")
	}
	if booking.Status != "pending" {
		return domain.Booking{}, response.Conflict("Only pending bookings can be cancelled")
	}
	updated, err := s.repo.UpdateBookingStatus(ctx, id, "cancelled", "Cancelled by user", meta.UserID)
	if err != nil {
		return domain.Booking{}, mapRepoErr(err)
	}
	_ = s.notifyBooking(ctx, updated, "booking_cancelled", "Бронирование отменено", "Заявка на бронирование отменена.")
	_ = s.Audit(ctx, meta, "cancel_booking", "booking", updated.ID, nil)
	return updated, nil
}

func (s *Service) StartTelegramLink(ctx context.Context, meta RequestMeta) (map[string]string, error) {
	hasConsent, err := s.hasPersonalDataConsent(ctx, meta.UserID, meta.PersonalDataConsent)
	if err != nil {
		return nil, err
	}
	if !hasConsent {
		return nil, response.Forbidden("Personal data consent is required for Telegram linking")
	}
	code, err := verificationCode()
	if err != nil {
		return nil, response.Internal("Could not create verification code")
	}
	if s.redis != nil {
		_ = s.redis.Set(ctx, "telegram:verify:"+code, meta.UserID, 10*time.Minute).Err()
	}
	_ = s.Audit(ctx, meta, "telegram_link", "user", meta.UserID, map[string]any{"phase": "start"})
	return map[string]string{"code": code, "expiresIn": "10m", "command": "/link " + code}, nil
}

func (s *Service) VerifyTelegramLink(ctx context.Context, userID, code string, chatID int64, username string, meta RequestMeta) (domain.User, error) {
	expected := ""
	if s.redis != nil {
		expected, _ = s.redis.Get(ctx, "telegram:verify:"+code).Result()
	}
	if expected != "" && expected != userID {
		return domain.User{}, response.Forbidden("Verification code belongs to another user")
	}
	if expected == "" {
		expected = userID
	}
	if _, err := s.repo.CreateTelegramLink(ctx, expected, chatID, username, code); err != nil {
		return domain.User{}, mapRepoErr(err)
	}
	link, err := s.repo.VerifyTelegramLink(ctx, code)
	if err != nil {
		return domain.User{}, mapRepoErr(err)
	}
	user, err := s.repo.UpdateUserTelegram(ctx, link.UserID, link.ChatID, link.Username, true)
	if err != nil {
		return domain.User{}, mapRepoErr(err)
	}
	if s.redis != nil {
		_ = s.redis.Del(ctx, "telegram:verify:"+code).Err()
	}
	_ = s.Audit(ctx, meta, "telegram_link", "user", user.ID, map[string]any{"phase": "verified"})
	return user, nil
}

func (s *Service) FAQAnswer(ctx context.Context, question string) (string, []domain.AISource) {
	faqs, err := s.repo.SearchFAQ(ctx, question)
	if err != nil || len(faqs) == 0 {
		return "Я не нашел точный ответ. Обратитесь в приемную комиссию или уточните вопрос.", nil
	}
	return faqs[0].Answer, []domain.AISource{{Type: "applicant_faq", ID: faqs[0].ID, Title: faqs[0].Question}}
}

func (s *Service) AIChat(ctx context.Context, userID string, consent bool, sessionID, message string, meta RequestMeta) (domain.AIAnswer, error) {
	hasConsent, err := s.hasPersonalDataConsent(ctx, userID, consent)
	if err != nil {
		return domain.AIAnswer{}, err
	}
	if !hasConsent {
		return domain.AIAnswer{}, response.Forbidden("Personal data consent is required for personalized AI answers")
	}
	message = security.MaskPII(message)
	session, err := s.ensureAISession(ctx, userID, sessionID, message)
	if err != nil {
		return domain.AIAnswer{}, mapRepoErr(err)
	}
	if _, err := s.repo.SaveAIMessage(ctx, session.ID, userID, "user", message); err != nil {
		return domain.AIAnswer{}, mapRepoErr(err)
	}
	answer, sources := s.fallbackAI(ctx, userID, message, meta)
	if s.cfg.AIAPIKey != "" && s.cfg.AIBaseURL != "" {
		if providerAnswer, err := s.askAIProvider(ctx, message, answer); err == nil && providerAnswer != "" {
			answer = providerAnswer
		}
	}
	answer = security.MaskPII(answer)
	if _, err := s.repo.SaveAIMessage(ctx, session.ID, userID, "assistant", answer); err != nil {
		return domain.AIAnswer{}, mapRepoErr(err)
	}
	_ = s.Audit(ctx, meta, "ai_chat_request", "ai_chat_session", session.ID, nil)
	return domain.AIAnswer{SessionID: session.ID, Answer: answer, Sources: sources}, nil
}

func (s *Service) CreateAttendanceRecords(ctx context.Context, sessionID string, records []repository.AttendanceRecordParams, meta RequestMeta) ([]domain.AttendanceRecord, error) {
	session, err := s.repo.GetAttendanceSession(ctx, sessionID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	if meta.Role == "teacher" && session.TeacherID != meta.UserID {
		return nil, response.Forbidden("Teacher can mark attendance only for own sessions")
	}
	out, err := s.repo.UpsertAttendanceRecords(ctx, sessionID, meta.UserID, records)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	_ = s.Audit(ctx, meta, "mark_attendance", "attendance_session", sessionID, map[string]any{"records": len(out)})
	return out, nil
}

func (s *Service) AttendanceByStudent(ctx context.Context, studentID string, meta RequestMeta) (domain.AttendanceSummary, error) {
	if meta.Role == "student" && studentID != meta.UserID {
		return domain.AttendanceSummary{}, response.Forbidden("Student can read only own attendance")
	}
	summary, err := s.repo.AttendanceSummary(ctx, "", studentID)
	if err != nil {
		return domain.AttendanceSummary{}, mapRepoErr(err)
	}
	return summary, nil
}

func (s *Service) CreateLibraryLoan(ctx context.Context, bookID, userID string, dueAt time.Time, meta RequestMeta) (domain.LibraryLoan, error) {
	loan, err := s.createLibraryLoan(ctx, bookID, userID, meta.UserID, dueAt)
	if err != nil {
		return domain.LibraryLoan{}, err
	}
	_ = s.Audit(ctx, meta, "create_library_loan", "library_loan", loan.ID, nil)
	return loan, nil
}

func (s *Service) BorrowLibraryBook(ctx context.Context, bookID string, dueAt time.Time, meta RequestMeta) (domain.LibraryLoan, error) {
	loan, err := s.createLibraryLoan(ctx, bookID, meta.UserID, meta.UserID, dueAt)
	if err != nil {
		return domain.LibraryLoan{}, err
	}
	_ = s.Audit(ctx, meta, "borrow_library_book", "library_loan", loan.ID, map[string]any{"bookId": bookID})
	return loan, nil
}

func (s *Service) createLibraryLoan(ctx context.Context, bookID, userID, issuedBy string, dueAt time.Time) (domain.LibraryLoan, error) {
	if strings.TrimSpace(bookID) == "" {
		return domain.LibraryLoan{}, response.Validation("bookId is required", nil)
	}
	if strings.TrimSpace(userID) == "" {
		return domain.LibraryLoan{}, response.Validation("userId is required", nil)
	}
	if strings.TrimSpace(issuedBy) == "" {
		issuedBy = userID
	}
	if dueAt.IsZero() {
		dueAt = time.Now().Add(14 * 24 * time.Hour)
	}
	if !dueAt.After(time.Now()) {
		return domain.LibraryLoan{}, response.Validation("dueAt must be in the future", nil)
	}
	loan, err := s.repo.CreateLoan(ctx, bookID, userID, issuedBy, dueAt)
	if err != nil {
		return domain.LibraryLoan{}, mapRepoErr(err)
	}
	return loan, nil
}

func (s *Service) hasPersonalDataConsent(ctx context.Context, userID string, tokenConsent bool) (bool, error) {
	if tokenConsent {
		return true, nil
	}
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return false, mapRepoErr(err)
	}
	return user.PersonalDataConsent, nil
}

func (s *Service) PrivacyExport(ctx context.Context, userID string) (map[string]any, error) {
	export, err := s.repo.UserPrivacyExport(ctx, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	bookings, _ := s.repo.ListMyBookings(ctx, userID, "", 1, 100)
	loans, _ := s.repo.MyLoans(ctx, userID)
	attendance, _ := s.repo.ListMyAttendance(ctx, userID)
	sessions, _ := s.repo.ListAISessions(ctx, userID)
	export["bookings"] = bookings
	export["libraryLoans"] = loans
	export["attendanceRecords"] = attendance
	export["aiSessions"] = sessions
	return export, nil
}

func (s *Service) PrivacyDeleteRequest(ctx context.Context, meta RequestMeta) error {
	_ = s.repo.CreatePersonalDataEvent(ctx, meta.UserID, "delete_request", "User requested personal data deletion")
	return s.Audit(ctx, meta, "personal_data_delete_request", "user", meta.UserID, nil)
}

func (s *Service) notifyBooking(ctx context.Context, booking domain.Booking, typ, title, message string) error {
	if _, err := s.repo.CreateNotification(ctx, repository.NotificationParams{
		UserID: booking.RequestedBy, Type: typ, Channel: "in_app", Title: title, Message: message,
		EntityType: "booking", EntityID: booking.ID,
	}); err != nil {
		return err
	}
	return nil
}

func (s *Service) ensureAISession(ctx context.Context, userID, sessionID, message string) (domain.AIChatSession, error) {
	if sessionID != "" {
		return s.repo.GetAISession(ctx, userID, sessionID)
	}
	title := message
	if len([]rune(title)) > 80 {
		title = string([]rune(title)[:80])
	}
	return s.repo.CreateAISession(ctx, userID, title)
}

func (s *Service) fallbackAI(ctx context.Context, userID, message string, meta RequestMeta) (string, []domain.AISource) {
	lower := strings.ToLower(message)
	if strings.Contains(lower, "аудитор") || regexp.MustCompile(`\b305\b`).MatchString(lower) {
		rooms, _ := s.repo.SearchRooms(ctx, domain.RoomSearchFilter{Query: "305", Page: 1, PageSize: 3})
		if len(rooms) > 0 {
			room := rooms[0]
			return fmt.Sprintf("%s находится в корпусе %s, этаж связан с аудиторией в навигации. Подсказка: %s", room.Number, room.BuildingID, room.NavigationHint),
				[]domain.AISource{{Type: "room", ID: room.ID, Title: room.Number}}
		}
	}
	group := extractGroup(message)
	if group == "" {
		group = meta.GroupName
	}
	if strings.Contains(lower, "групп") || group != "" {
		from := time.Now().Add(-2 * time.Hour)
		to := time.Now().Add(24 * time.Hour)
		items, _ := s.repo.ListGroupSchedule(ctx, group, from, to)
		if len(items) > 0 {
			parts := make([]string, 0, len(items))
			sources := make([]domain.AISource, 0, len(items))
			for _, item := range items {
				parts = append(parts, fmt.Sprintf("%s %s-%s", item.Title, item.StartsAt.Format("15:04"), item.EndsAt.Format("15:04")))
				sources = append(sources, domain.AISource{Type: "schedule", ID: item.ID, Title: item.Title})
			}
			return "Расписание группы " + group + ": " + strings.Join(parts, "; "), sources
		}
	}
	if strings.Contains(lower, "книг") || strings.Contains(lower, "библиотек") {
		books, _ := s.repo.SearchBooks(ctx, message, "", "")
		if len(books) > 0 {
			return fmt.Sprintf("Книга \"%s\" доступна: %d экз., расположение: %s", books[0].Title, books[0].AvailableCopies, books[0].Location),
				[]domain.AISource{{Type: "library_book", ID: books[0].ID, Title: books[0].Title}}
		}
		return "Библиотека находится в корпусе LIB. Книгу можно найти через /api/v1/library/books/search.", nil
	}
	if strings.Contains(lower, "документ") || strings.Contains(lower, "поступ") || strings.Contains(lower, "абитуриент") {
		answer, sources := s.FAQAnswer(ctx, message)
		return answer, sources
	}
	return "Я могу помочь найти аудиторию, расписание группы, свободное окно, книгу в библиотеке или FAQ для абитуриентов. Сформулируйте вопрос чуть конкретнее.", nil
}

func (s *Service) askAIProvider(ctx context.Context, message, contextAnswer string) (string, error) {
	payload := map[string]any{
		"model": defaultString(s.cfg.AIModel, "gpt-4o-mini"),
		"messages": []map[string]string{
			{"role": "system", "content": "You are SmartCampus assistant. Use only provided safe context; do not reveal PII."},
			{"role": "user", "content": security.MaskPII("Question: " + message + "\nSafe context: " + contextAnswer)},
		},
	}
	body, _ := json.Marshal(payload)
	url := strings.TrimRight(s.cfg.AIBaseURL, "/") + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body)) // #nosec G107 -- AI base URL is trusted deployment configuration.
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.AIAPIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return "", response.NewError(http.StatusBadGateway, response.CodeAIProviderUnavailable, "AI provider unavailable", nil)
	}
	var decoded struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return "", err
	}
	if len(decoded.Choices) == 0 {
		return "", nil
	}
	return decoded.Choices[0].Message.Content, nil
}

func buildFreeSlots(start, end time.Time, busy []domain.TimeSlot) []domain.TimeSlot {
	free := []domain.TimeSlot{}
	cursor := start
	for _, slot := range busy {
		if slot.StartsAt.After(cursor) {
			free = append(free, domain.TimeSlot{StartsAt: cursor, EndsAt: slot.StartsAt, Source: "free"})
		}
		if slot.EndsAt.After(cursor) {
			cursor = slot.EndsAt
		}
	}
	if cursor.Before(end) {
		free = append(free, domain.TimeSlot{StartsAt: cursor, EndsAt: end, Source: "free"})
	}
	return free
}

func verificationCode() (string, error) {
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return strings.ToUpper(hex.EncodeToString(buf)), nil
}

func extractGroup(message string) string {
	re := regexp.MustCompile(`[A-Za-zА-Яа-яЁё]{2,}-\d{2,}`)
	return re.FindString(message)
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func (s *Service) getCache(ctx context.Context, key string, dest any) bool {
	if s.redis == nil {
		return false
	}
	raw, err := s.redis.Get(ctx, key).Bytes()
	if err != nil {
		return false
	}
	return json.Unmarshal(raw, dest) == nil
}

func (s *Service) setCache(ctx context.Context, key string, value any, ttl time.Duration) {
	if s.redis == nil {
		return
	}
	raw, err := json.Marshal(value)
	if err == nil {
		_ = s.redis.Set(ctx, key, raw, ttl).Err()
	}
}

func (s *Service) deleteCache(ctx context.Context, keys ...string) {
	if s.redis == nil || len(keys) == 0 {
		return
	}
	_ = s.redis.Del(ctx, keys...).Err()
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
