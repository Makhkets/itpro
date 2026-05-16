package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	isuBaseURL      = "https://backend-isu.gstou.ru/api/timetable/public/entrie/"
	isuExamBaseURL  = "https://backend-isu.gstou.ru/api/timetable/public/entrie/exam/"
	isuInstitutesURL = "https://backend-isu.gstou.ru/api/institutes/"
	isuOrigin       = "https://isu.gstou.ru"
	isuReferer      = "https://isu.gstou.ru/"
	isuCacheTTL     = 5 * time.Minute
	isuHTTPTimeout  = 12 * time.Second
)

// ISUEntry mirrors a single timetable entry returned by ISU GSTOU public API.
type ISUEntry struct {
	ID           int64      `json:"id"`
	Auditorium   ISUAud     `json:"auditorium"`
	Discipline   ISUDisc    `json:"discipline"`
	ActivityType int        `json:"activity_type"`
	Week         *int       `json:"week"`
	WeekDay      int        `json:"week_day"`
	Period       int        `json:"period"`
	Duration     int        `json:"duration"`
	IsSplit      bool       `json:"is_split"`
	GroupNumber  *int       `json:"group_number"`
	Info         *string    `json:"info"`
	Date         *string    `json:"date"`
	Groups       []ISUGroup `json:"groups"`
}

type ISUAud struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Capacity *int   `json:"capacity"`
	Variant  string `json:"variant"`
}

type ISUDisc struct {
	ID              int64      `json:"id"`
	Name            string     `json:"name"`
	Semester        string     `json:"semester"`
	ReportingType   string     `json:"reporting_type"`
	LectureTeacher  ISUTeacher `json:"lecture_teacher"`
	PracticeTeacher ISUTeacher `json:"practice_teacher"`
	LabTeacher      ISUTeacher `json:"lab_teacher"`
}

type ISUTeacher struct {
	ID     *int64 `json:"id,omitempty"`
	UserID *int64 `json:"user_id,omitempty"`
	Name   string `json:"name,omitempty"`
}

type ISUGroup struct {
	ID           int64   `json:"id"`
	Name         string  `json:"name"`
	TrainingForm string  `json:"training_form"`
	Direction    string  `json:"direction"`
	Institute    ISUInst `json:"institute"`
}

type ISUInst struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// ISUClient fetches and caches timetable data from ISU GSTOU.
type ISUClient struct {
	http  *http.Client
	redis *redis.Client
}

func NewISUClient(redisClient *redis.Client, proxyURL string) *ISUClient {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
	}
	if proxyURL != "" {
		if parsed, err := url.Parse(proxyURL); err == nil && parsed.Host != "" {
			transport.Proxy = http.ProxyURL(parsed)
		}
	}
	return &ISUClient{
		http: &http.Client{
			Timeout:   isuHTTPTimeout,
			Transport: transport,
		},
		redis: redisClient,
	}
}

func (c *ISUClient) ByGroup(ctx context.Context, groupName string) ([]ISUEntry, error) {
	groupName = strings.TrimSpace(groupName)
	if groupName == "" {
		return nil, errors.New("group name is required")
	}
	return c.fetch(ctx, isuBaseURL, "group", groupName)
}

func (c *ISUClient) ByTeacher(ctx context.Context, teacherName string) ([]ISUEntry, error) {
	teacherName = strings.TrimSpace(teacherName)
	if teacherName == "" {
		return nil, errors.New("teacher name is required")
	}
	return c.fetch(ctx, isuBaseURL, "teacher", teacherName)
}

func (c *ISUClient) ByGroupExam(ctx context.Context, groupName string) ([]ISUEntry, error) {
	groupName = strings.TrimSpace(groupName)
	if groupName == "" {
		return nil, errors.New("group name is required")
	}
	return c.fetch(ctx, isuExamBaseURL, "group", groupName)
}

func (c *ISUClient) ByTeacherExam(ctx context.Context, teacherName string) ([]ISUEntry, error) {
	teacherName = strings.TrimSpace(teacherName)
	if teacherName == "" {
		return nil, errors.New("teacher name is required")
	}
	return c.fetch(ctx, isuExamBaseURL, "teacher", teacherName)
}

// Institutes fetches the list of ISU institutes (public, no auth).
func (c *ISUClient) Institutes(ctx context.Context) (json.RawMessage, error) {
	cacheKey := "cache:isu:institutes"
	if c.redis != nil {
		if cached, err := c.redis.Get(ctx, cacheKey).Bytes(); err == nil && len(cached) > 0 {
			return json.RawMessage(cached), nil
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, isuInstitutesURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Origin", isuOrigin)
	req.Header.Set("Referer", isuReferer)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("isu institutes request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("isu returned status %d: %s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, 65536))
	if err != nil {
		return nil, fmt.Errorf("isu institutes read failed: %w", err)
	}

	if c.redis != nil {
		_ = c.redis.Set(ctx, cacheKey, data, 30*time.Minute).Err()
	}
	return json.RawMessage(data), nil
}

func (c *ISUClient) fetch(ctx context.Context, baseURL, paramName, paramValue string) ([]ISUEntry, error) {
	cacheKey := fmt.Sprintf("cache:isu:%s:%s:%s", baseURL, paramName, strings.ToLower(paramValue))
	if c.redis != nil {
		if cached, err := c.redis.Get(ctx, cacheKey).Bytes(); err == nil && len(cached) > 0 {
			var entries []ISUEntry
			if err := json.Unmarshal(cached, &entries); err == nil {
				return entries, nil
			}
		}
	}

	u, _ := url.Parse(baseURL)
	q := u.Query()
	q.Set(paramName, paramValue)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Origin", isuOrigin)
	req.Header.Set("Referer", isuReferer)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("isu request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return []ISUEntry{}, nil
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("isu returned status %d: %s", resp.StatusCode, string(body))
	}

	var entries []ISUEntry
	if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
		return nil, fmt.Errorf("isu decode failed: %w", err)
	}

	if c.redis != nil {
		if data, err := json.Marshal(entries); err == nil {
			_ = c.redis.Set(ctx, cacheKey, data, isuCacheTTL).Err()
		}
	}
	return entries, nil
}
