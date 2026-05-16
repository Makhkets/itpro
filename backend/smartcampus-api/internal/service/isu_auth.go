package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/smartcampus/smartcampus-api/internal/domain"
	"github.com/smartcampus/smartcampus-api/pkg/logger"
)

const (
	isuBackendURL    = "https://backend-isu.gstou.ru"
	isuAuthTimeout   = 15 * time.Second
	isuSessionTTL    = 30 * time.Minute
	isuSessionPrefix = "isu_session:"
)

// ISUAuthClient handles authenticated requests to ISU GSTOU backend.
type ISUAuthClient struct {
	http  *http.Client
	redis *redis.Client
	log   *logger.Logger
}

// ISUStudentProfile represents user profile data from ISU.
type ISUStudentProfile struct {
	UserID    int      `json:"user_id"`
	FullName  string   `json:"full_name"`
	GroupName string   `json:"group_name"`
	Institute string   `json:"institute"`
	Roles     []string `json:"roles"`
}

// isuLoginPayload is the request body sent to ISU login.
type isuLoginPayload struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func NewISUAuthClient(redisClient *redis.Client, log *logger.Logger) *ISUAuthClient {
	return &ISUAuthClient{
		http: &http.Client{
			Timeout: isuAuthTimeout,
		},
		redis: redisClient,
		log:   log,
	}
}

// ISULoginResult contains the token and profile data returned by ISU /api/token/.
type ISULoginResult struct {
	Token    string
	Profile  ISUStudentProfile
}

// Login authenticates against ISU backend and returns token + profile.
func (c *ISUAuthClient) Login(ctx context.Context, username, password string) (ISULoginResult, error) {
	payload, _ := json.Marshal(isuLoginPayload{Username: username, Password: password})

	ep := isuBackendURL + "/api/token/"
	result, err := c.tryLogin(ctx, ep, payload)
	if err != nil {
		c.log.Error("isu_login_failed", "endpoint", ep, "username", username, "error", err)
		return ISULoginResult{}, fmt.Errorf("isu login failed: %w", err)
	}

	c.log.Info("isu_login_success", "endpoint", ep, "username", username, "user_id", result.Profile.UserID)
	return result, nil
}

// isuTokenResponse matches the JSON from POST /api/token/.
type isuTokenResponse struct {
	Token    string   `json:"token"`
	UserID   int      `json:"user_id"`
	FullName string   `json:"full_name"`
	Roles    []string `json:"role"`
	Dep      *string  `json:"dep"`
}

func (c *ISUAuthClient) tryLogin(ctx context.Context, url string, body []byte) (ISULoginResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return ISULoginResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Origin", isuOrigin)
	req.Header.Set("Referer", isuReferer)

	resp, err := c.http.Do(req)
	if err != nil {
		return ISULoginResult{}, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return ISULoginResult{}, fmt.Errorf("invalid credentials (status %d)", resp.StatusCode)
	}
	if resp.StatusCode >= 400 {
		return ISULoginResult{}, fmt.Errorf("isu returned status %d: %s", resp.StatusCode, truncate(string(respBody), 300))
	}

	var tokenResp isuTokenResponse
	if err := json.Unmarshal(respBody, &tokenResp); err != nil {
		return ISULoginResult{}, fmt.Errorf("failed to parse response: %w", err)
	}

	if tokenResp.Token == "" {
		return ISULoginResult{}, fmt.Errorf("empty token in response")
	}

	profile := ISUStudentProfile{
		UserID:   tokenResp.UserID,
		FullName: tokenResp.FullName,
		Roles:    tokenResp.Roles,
	}
	if tokenResp.Dep != nil {
		profile.Institute = *tokenResp.Dep
	}

	return ISULoginResult{Token: tokenResp.Token, Profile: profile}, nil
}

// FetchProfile fetches the authenticated user's profile from ISU.
func (c *ISUAuthClient) FetchProfile(ctx context.Context, isuToken string) (ISUStudentProfile, error) {
	endpoints := []string{
		isuBackendURL + "/api/user/profile/",
		isuBackendURL + "/api/auth/user/",
		isuBackendURL + "/api/student/profile/",
		isuBackendURL + "/api/user/",
	}

	var profile ISUStudentProfile
	var lastErr error
	for _, ep := range endpoints {
		p, err := c.fetchJSON(ctx, ep, isuToken)
		if err == nil {
			profile = c.parseProfile(p)
			if profile.FullName != "" || profile.UserID != 0 {
				c.log.Info("isu_profile_success", "endpoint", ep)
				return profile, nil
			}
		}
		lastErr = err
		c.log.Info("isu_profile_attempt", "endpoint", ep, "error", err)
	}

	// Also try the roles endpoint to at least get roles
	rolesData, err := c.fetchJSON(ctx, isuBackendURL+"/api/user/roles/", isuToken)
	if err == nil {
		profile.Roles = c.parseRoles(rolesData)
	}

	if profile.FullName == "" && profile.UserID == 0 {
		if lastErr != nil {
			return profile, fmt.Errorf("isu profile fetch failed: %w", lastErr)
		}
		return profile, fmt.Errorf("isu profile fetch failed: no data returned")
	}
	return profile, nil
}

// --- ISU BRS internal types for JSON parsing ---

type isuTeacher struct {
	ID     int    `json:"id"`
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
}

type isuDiscipline struct {
	ID              int        `json:"id"`
	Semester        string     `json:"semester"`
	ReportingType   string     `json:"reporting_type"`
	LectureTeacher  isuTeacher `json:"lecture_teacher"`
	PracticeTeacher isuTeacher `json:"practice_teacher"`
	LabTeacher      isuTeacher `json:"lab_teacher"`
	Name            string     `json:"name"`
	IsOpen1         bool       `json:"is_open1"`
	IsOpen2         bool       `json:"is_open2"`
}

type isuGradesResp struct {
	Pos      float64 `json:"pos"`
	Tek1     float64 `json:"tek1"`
	Rub1     float64 `json:"rub1"`
	Tek2     float64 `json:"tek2"`
	Rub2     float64 `json:"rub2"`
	Samost   float64 `json:"samost"`
	Dosdacha float64 `json:"dosdacha"`
	Premial  float64 `json:"premial"`
}

// FetchGrades fetches BRS grades for the authenticated user.
// Flow: 1) GET disciplines list  2) GET grades/{id} for each  3) combine.
func (c *ISUAuthClient) FetchGrades(ctx context.Context, isuToken string, yearStart, yearEnd, semester int) ([]domain.BRSGrade, error) {
	qs := fmt.Sprintf("start=%d&end=%d&semester=%d", yearStart, yearEnd, semester)

	// Step 1: fetch disciplines
	raw, err := c.fetchJSONRaw(ctx, fmt.Sprintf("%s/api/brs/student/disciplines/?%s", isuBackendURL, qs), isuToken)
	if err != nil {
		return nil, fmt.Errorf("fetch disciplines: %w", err)
	}

	var disciplines []isuDiscipline
	if err := json.Unmarshal(raw, &disciplines); err != nil {
		return nil, fmt.Errorf("parse disciplines: %w", err)
	}
	c.log.Info("isu_brs_disciplines", "count", len(disciplines))

	if len(disciplines) == 0 {
		return []domain.BRSGrade{}, nil
	}

	// Step 2: fetch grades for each discipline concurrently
	type gradeResult struct {
		idx    int
		grades isuGradesResp
		ok     bool
	}

	results := make([]gradeResult, len(disciplines))
	var wg sync.WaitGroup
	for i, d := range disciplines {
		wg.Add(1)
		go func(idx int, discID int) {
			defer wg.Done()
			gep := fmt.Sprintf("%s/api/brs/student/grades/%d/?%s", isuBackendURL, discID, qs)
			raw, err := c.fetchJSONRaw(ctx, gep, isuToken)
			if err != nil {
				c.log.Info("isu_grade_fetch_err", "discipline_id", discID, "error", err)
				return
			}
			var g isuGradesResp
			if err := json.Unmarshal(raw, &g); err != nil {
				c.log.Info("isu_grade_parse_err", "discipline_id", discID, "error", err)
				return
			}
			results[idx] = gradeResult{idx: idx, grades: g, ok: true}
		}(i, d.ID)
	}
	wg.Wait()

	// Step 3: combine
	brsGrades := make([]domain.BRSGrade, 0, len(disciplines))
	for i, d := range disciplines {
		var g isuGradesResp
		if results[i].ok {
			g = results[i].grades
		}
		total := g.Tek1 + g.Rub1 + g.Tek2 + g.Rub2 + g.Samost + g.Dosdacha + g.Premial

		brsGrades = append(brsGrades, domain.BRSGrade{
			DisciplineID:    d.ID,
			DisciplineName:  d.Name,
			TeacherName:     isuTeacherNames(d),
			Att1Current:     g.Tek1,
			Att1Border:      g.Rub1,
			Att2Current:     g.Tek2,
			Att2Border:      g.Rub2,
			Attendance:      g.Pos,
			IndependentWork: g.Samost,
			Retake:          g.Dosdacha,
			Bonus:           g.Premial,
			Total:           total,
			ExamType:        d.ReportingType,
			IsOpen1:         d.IsOpen1,
			IsOpen2:         d.IsOpen2,
		})
	}

	c.log.Info("isu_brs_grades_done", "count", len(brsGrades))
	return brsGrades, nil
}

// isuTeacherNames extracts unique teacher names from a discipline.
func isuTeacherNames(d isuDiscipline) string {
	seen := map[string]bool{}
	var names []string
	for _, t := range []isuTeacher{d.LectureTeacher, d.PracticeTeacher, d.LabTeacher} {
		if t.Name != "" && !seen[t.Name] {
			seen[t.Name] = true
			names = append(names, t.Name)
		}
	}
	return strings.Join(names, ", ")
}

// FetchDisciplineJournal fetches per-lesson attendance data for a discipline.
func (c *ISUAuthClient) FetchDisciplineJournal(ctx context.Context, isuToken string, disciplineID, yearStart, yearEnd, semester int) ([]domain.BRSJournalEntry, error) {
	ep := fmt.Sprintf("%s/api/brs/student/journal/%d/?start=%d&end=%d&semester=%d", isuBackendURL, disciplineID, yearStart, yearEnd, semester)
	raw, err := c.fetchJSONRaw(ctx, ep, isuToken)
	if err != nil {
		return nil, fmt.Errorf("fetch journal: %w", err)
	}
	var entries []domain.BRSJournalEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, fmt.Errorf("parse journal: %w", err)
	}
	return entries, nil
}

// FetchStudentSchedule fetches the authenticated student's personal timetable.
func (c *ISUAuthClient) FetchStudentSchedule(ctx context.Context, isuToken string) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/timetable/student/entrie/", isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu student schedule fetch failed: %w", err)
	}
	return raw, nil
}

// FetchStudentExamSchedule fetches the authenticated student's exam schedule.
func (c *ISUAuthClient) FetchStudentExamSchedule(ctx context.Context, isuToken string) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/timetable/student/entrie/exam/", isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu student exam schedule fetch failed: %w", err)
	}
	return raw, nil
}

// FetchRoles fetches user roles from ISU.
func (c *ISUAuthClient) FetchUserRoles(ctx context.Context, isuToken string) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/roles/", isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu roles fetch failed: %w", err)
	}
	return raw, nil
}

// FetchBRSProfile fetches the student's BRS profile.
func (c *ISUAuthClient) FetchBRSProfile(ctx context.Context, isuToken string, yearStart, yearEnd, semester int) (json.RawMessage, error) {
	ep := fmt.Sprintf("%s/api/brs/student/profile/?start=%d&end=%d&semester=%d", isuBackendURL, yearStart, yearEnd, semester)
	raw, err := c.fetchJSONRaw(ctx, ep, isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu brs profile fetch failed: %w", err)
	}
	return raw, nil
}

// FetchInstitutes fetches the list of institutes from ISU (no auth required but we pass it anyway).
func (c *ISUAuthClient) FetchInstitutes(ctx context.Context) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/institutes/", "")
	if err != nil {
		return nil, fmt.Errorf("isu institutes fetch failed: %w", err)
	}
	return raw, nil
}

// FetchBRSSpecializationAverage fetches the student's specialization average from ISU.
func (c *ISUAuthClient) FetchBRSSpecializationAverage(ctx context.Context, isuToken string, yearStart, yearEnd, semester int) (json.RawMessage, error) {
	ep := fmt.Sprintf("%s/api/brs/student/specialization-average/?start=%d&end=%d&semester=%d", isuBackendURL, yearStart, yearEnd, semester)
	raw, err := c.fetchJSONRaw(ctx, ep, isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu brs specialization average fetch failed: %w", err)
	}
	return raw, nil
}

// FetchBRSDisciplines fetches the student's BRS disciplines from ISU.
func (c *ISUAuthClient) FetchBRSDisciplines(ctx context.Context, isuToken string, yearStart, yearEnd, semester int) (json.RawMessage, error) {
	ep := fmt.Sprintf("%s/api/brs/student/disciplines/?start=%d&end=%d&semester=%d", isuBackendURL, yearStart, yearEnd, semester)
	raw, err := c.fetchJSONRaw(ctx, ep, isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu brs disciplines fetch failed: %w", err)
	}
	return raw, nil
}

// FetchTeacherSchedule fetches the authenticated teacher's timetable.
func (c *ISUAuthClient) FetchTeacherSchedule(ctx context.Context, isuToken string) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/timetable/teacher/entrie/", isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu teacher schedule fetch failed: %w", err)
	}
	return raw, nil
}

// FetchTeacherExamSchedule fetches the authenticated teacher's exam schedule.
func (c *ISUAuthClient) FetchTeacherExamSchedule(ctx context.Context, isuToken string) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/timetable/teacher/entrie/exam/", isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu teacher exam schedule fetch failed: %w", err)
	}
	return raw, nil
}

// FetchContracts fetches the user's contracts from ISU.
func (c *ISUAuthClient) FetchContracts(ctx context.Context, isuToken string) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/contracts/", isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu contracts fetch failed: %w", err)
	}
	return raw, nil
}

// FetchContractsYears fetches available contract years from ISU.
func (c *ISUAuthClient) FetchContractsYears(ctx context.Context, isuToken string) (json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, isuBackendURL+"/api/contracts/years/", isuToken)
	if err != nil {
		return nil, fmt.Errorf("isu contracts years fetch failed: %w", err)
	}
	return raw, nil
}

// SaveISUSession stores the ISU token in Redis for later use (BRS queries).
func (c *ISUAuthClient) SaveISUSession(ctx context.Context, userID, isuToken string) {
	if c.redis == nil {
		return
	}
	_ = c.redis.Set(ctx, isuSessionPrefix+userID, isuToken, isuSessionTTL).Err()
}

// GetISUSession retrieves the stored ISU token for a user.
func (c *ISUAuthClient) GetISUSession(ctx context.Context, userID string) (string, error) {
	if c.redis == nil {
		return "", fmt.Errorf("redis not available")
	}
	token, err := c.redis.Get(ctx, isuSessionPrefix+userID).Result()
	if err != nil {
		return "", fmt.Errorf("isu session not found or expired")
	}
	return token, nil
}

// fetchJSONRaw does GET with JWT token and returns the raw response bytes.
func (c *ISUAuthClient) fetchJSONRaw(ctx context.Context, url, token string) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Origin", isuOrigin)
	req.Header.Set("Referer", isuReferer)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 65536))

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusMethodNotAllowed {
		return nil, fmt.Errorf("endpoint not found (status %d)", resp.StatusCode)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("isu returned status %d: %s", resp.StatusCode, truncate(string(body), 300))
	}

	c.log.Info("isu_fetch_response", "url", url, "status", resp.StatusCode, "body_len", len(body))
	return json.RawMessage(body), nil
}

// fetchJSON does GET with JWT token and returns parsed object data (legacy helper).
func (c *ISUAuthClient) fetchJSON(ctx context.Context, url, token string) (map[string]json.RawMessage, error) {
	raw, err := c.fetchJSONRaw(ctx, url, token)
	if err != nil {
		return nil, err
	}
	var data map[string]json.RawMessage
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, fmt.Errorf("failed to parse as object: %w", err)
	}
	return data, nil
}

// parseProfile extracts profile fields from various possible response formats.
func (c *ISUAuthClient) parseProfile(data map[string]json.RawMessage) ISUStudentProfile {
	var profile ISUStudentProfile

	// Try direct fields
	tryUnmarshalInt(data, "user_id", &profile.UserID)
	tryUnmarshalInt(data, "id", &profile.UserID)
	tryUnmarshalString(data, "full_name", &profile.FullName)
	tryUnmarshalString(data, "fio", &profile.FullName)
	tryUnmarshalString(data, "name", &profile.FullName)
	tryUnmarshalString(data, "group_name", &profile.GroupName)
	tryUnmarshalString(data, "group", &profile.GroupName)
	tryUnmarshalString(data, "institute", &profile.Institute)
	tryUnmarshalString(data, "faculty", &profile.Institute)
	profile.Roles = c.parseRoles(data)

	// Try first_name + last_name + middle_name
	if profile.FullName == "" {
		var first, last, middle string
		tryUnmarshalString(data, "first_name", &first)
		tryUnmarshalString(data, "last_name", &last)
		tryUnmarshalString(data, "middle_name", &middle)
		if last != "" {
			profile.FullName = last
			if first != "" {
				profile.FullName += " " + first
			}
			if middle != "" {
				profile.FullName += " " + middle
			}
		}
	}

	// Try nested "data" or "user" key
	for _, key := range []string{"data", "user", "profile", "student"} {
		if val, ok := data[key]; ok {
			var nested map[string]json.RawMessage
			if json.Unmarshal(val, &nested) == nil {
				inner := c.parseProfile(nested)
				if inner.FullName != "" && profile.FullName == "" {
					profile.FullName = inner.FullName
				}
				if inner.UserID != 0 && profile.UserID == 0 {
					profile.UserID = inner.UserID
				}
				if inner.GroupName != "" && profile.GroupName == "" {
					profile.GroupName = inner.GroupName
				}
				if inner.Institute != "" && profile.Institute == "" {
					profile.Institute = inner.Institute
				}
				if len(inner.Roles) > 0 && len(profile.Roles) == 0 {
					profile.Roles = inner.Roles
				}
			}
		}
	}

	return profile
}

// parseRoles extracts roles from response data.
func (c *ISUAuthClient) parseRoles(data map[string]json.RawMessage) []string {
	for _, key := range []string{"roles", "role", "user_roles"} {
		if val, ok := data[key]; ok {
			var roles []string
			if json.Unmarshal(val, &roles) == nil {
				return roles
			}
			// Maybe it's a single string role
			var single string
			if json.Unmarshal(val, &single) == nil && single != "" {
				return []string{single}
			}
		}
	}
	return nil
}

func tryUnmarshalString(data map[string]json.RawMessage, key string, dest *string) {
	if *dest != "" {
		return
	}
	if val, ok := data[key]; ok {
		var s string
		if json.Unmarshal(val, &s) == nil {
			*dest = s
		}
	}
}

func tryUnmarshalInt(data map[string]json.RawMessage, key string, dest *int) {
	if *dest != 0 {
		return
	}
	if val, ok := data[key]; ok {
		var i int
		if json.Unmarshal(val, &i) == nil {
			*dest = i
		}
	}
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
