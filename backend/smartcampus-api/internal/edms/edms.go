// Package edms — модуль электронного документооборота (ЭДО) для SmartCampus.
//
// Хранилище — in-memory: модуль работает как заглушка/демо без миграций БД.
// Поведение и формы данных полностью совместимы с реальной БД-реализацией:
// API стабильно, типы экспортируются, состояние сидируется демо-документами
// для всех ключевых ролей (студент, преподаватель, абитуриент, админ/деканат).
package edms

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ---------- ошибки ----------

var (
	ErrNotFound  = errors.New("edms: not found")
	ErrForbidden = errors.New("edms: forbidden")
	ErrConflict  = errors.New("edms: conflict")
	ErrInvalid   = errors.New("edms: invalid input")
)

// ---------- модель ----------

type DocumentStatus string

const (
	StatusDraft     DocumentStatus = "draft"
	StatusOnReview  DocumentStatus = "on_review"
	StatusApproved  DocumentStatus = "approved"
	StatusRejected  DocumentStatus = "rejected"
	StatusSigned    DocumentStatus = "signed"
	StatusArchived  DocumentStatus = "archived"
	StatusCancelled DocumentStatus = "cancelled"
)

type DocumentDirection string

const (
	DirectionIncoming DocumentDirection = "incoming"
	DirectionOutgoing DocumentDirection = "outgoing"
	DirectionInternal DocumentDirection = "internal"
)

type Priority string

const (
	PriorityLow      Priority = "low"
	PriorityNormal   Priority = "normal"
	PriorityHigh     Priority = "high"
	PriorityCritical Priority = "critical"
)

type Party struct {
	ID       string `json:"id"`
	FullName string `json:"fullName"`
	Role     string `json:"role"`
	Position string `json:"position,omitempty"`
	Email    string `json:"email,omitempty"`
}

type Attachment struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Size     int64     `json:"size"`
	MimeType string    `json:"mimeType"`
	URL      string    `json:"url"`
	Uploaded time.Time `json:"uploaded"`
}

type ApprovalStep struct {
	ID         string     `json:"id"`
	Order      int        `json:"order"`
	Approver   Party      `json:"approver"`
	Status     string     `json:"status"` // pending | approved | rejected | signed | skipped
	Comment    string     `json:"comment,omitempty"`
	ActedAt    *time.Time `json:"actedAt,omitempty"`
	SLAHours   int        `json:"slaHours"`
	IsCurrent  bool       `json:"isCurrent"`
	SignatureID string    `json:"signatureId,omitempty"`
}

type TimelineEvent struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // created | submitted | step_approved | step_rejected | signed | commented | archived
	Actor     Party     `json:"actor"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

type Signature struct {
	ID         string    `json:"id"`
	Signer     Party     `json:"signer"`
	Method     string    `json:"method"` // simple | enhanced_unqualified | enhanced_qualified
	Algorithm  string    `json:"algorithm"`
	Thumbprint string    `json:"thumbprint"`
	SignedAt   time.Time `json:"signedAt"`
	Valid      bool      `json:"valid"`
}

type Document struct {
	ID             string             `json:"id"`
	RegNumber      string             `json:"regNumber"`
	Title          string             `json:"title"`
	Type           string             `json:"type"`     // statement | order | reference | application | memo | contract | report
	Category       string             `json:"category"` // academic | hr | financial | legal | admission | general
	Direction      DocumentDirection  `json:"direction"`
	Status         DocumentStatus     `json:"status"`
	Priority       Priority           `json:"priority"`
	Description    string             `json:"description,omitempty"`
	Body           string             `json:"body,omitempty"`
	Author         Party              `json:"author"`
	Recipient      *Party             `json:"recipient,omitempty"`
	Department     string             `json:"department,omitempty"`
	TemplateID     string             `json:"templateId,omitempty"`
	RouteID        string             `json:"routeId,omitempty"`
	Tags           []string           `json:"tags"`
	Attachments    []Attachment       `json:"attachments"`
	ApprovalRoute  []ApprovalStep     `json:"approvalRoute"`
	Signatures     []Signature        `json:"signatures"`
	Timeline       []TimelineEvent    `json:"timeline"`
	Fields         map[string]string  `json:"fields"`
	CreatedAt      time.Time          `json:"createdAt"`
	UpdatedAt      time.Time          `json:"updatedAt"`
	DueAt          *time.Time         `json:"dueAt,omitempty"`
	SignedAt       *time.Time         `json:"signedAt,omitempty"`
	ArchivedAt     *time.Time         `json:"archivedAt,omitempty"`
}

type TemplateField struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Type        string `json:"type"` // text | textarea | date | number | select
	Required    bool   `json:"required"`
	Placeholder string `json:"placeholder,omitempty"`
	Options     []string `json:"options,omitempty"`
}

type Template struct {
	ID          string          `json:"id"`
	Code        string          `json:"code"`
	Title       string          `json:"title"`
	Category    string          `json:"category"`
	Description string          `json:"description"`
	Body        string          `json:"body"`
	Fields      []TemplateField `json:"fields"`
	RouteID     string          `json:"routeId"`
	Roles       []string        `json:"roles"`
	Popularity  int             `json:"popularity"`
	Icon        string          `json:"icon"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type RouteStep struct {
	Order      int    `json:"order"`
	Role       string `json:"role"`     // approver role: dean | rector | hr | head | accountant
	Title      string `json:"title"`
	SLAHours   int    `json:"slaHours"`
	IsParallel bool   `json:"isParallel"`
}

type Route struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Steps       []RouteStep `json:"steps"`
	UsageCount  int         `json:"usageCount"`
	AvgHours    int         `json:"avgHours"`
	UpdatedAt   time.Time   `json:"updatedAt"`
}

type AnalyticsSummary struct {
	TotalDocuments    int            `json:"totalDocuments"`
	InProgress        int            `json:"inProgress"`
	AwaitingMyAction  int            `json:"awaitingMyAction"`
	SignedThisMonth   int            `json:"signedThisMonth"`
	OverdueDocuments  int            `json:"overdueDocuments"`
	AverageCycleHours float64        `json:"averageCycleHours"`
	SLAComplianceRate float64        `json:"slaComplianceRate"`
	ByStatus          map[string]int `json:"byStatus"`
	ByType            map[string]int `json:"byType"`
	ByCategory        map[string]int `json:"byCategory"`
	Trend             []TrendPoint   `json:"trend"`
	TopAuthors        []AuthorVolume `json:"topAuthors"`
	BottlenecksSteps  []Bottleneck   `json:"bottlenecks"`
}

type TrendPoint struct {
	Date     string `json:"date"`
	Created  int    `json:"created"`
	Signed   int    `json:"signed"`
	Rejected int    `json:"rejected"`
}

type AuthorVolume struct {
	Author Party `json:"author"`
	Count  int   `json:"count"`
}

type Bottleneck struct {
	Step      string  `json:"step"`
	AvgHours  float64 `json:"avgHours"`
	Pending   int     `json:"pending"`
}

// ---------- Store ----------

// Store держит модель ЭДО в памяти; потокобезопасен.
type Store struct {
	mu        sync.RWMutex
	docs      map[string]*Document
	templates map[string]*Template
	routes    map[string]*Route
	regSeq    int
}

func NewStore() *Store {
	s := &Store{
		docs:      make(map[string]*Document),
		templates: make(map[string]*Template),
		routes:    make(map[string]*Route),
	}
	s.seed()
	return s
}

// ---------- query/filter ----------

type ListFilter struct {
	Status    string
	Type      string
	Category  string
	Direction string
	Priority  string
	AuthorID  string
	Query     string
	Tag       string
	Mine      bool
	Inbox     bool   // документы где я согласующий и шаг текущий
	Page      int
	PageSize  int
}

type ListResult struct {
	Items    []Document `json:"items"`
	Total    int        `json:"total"`
	Page     int        `json:"page"`
	PageSize int        `json:"pageSize"`
}

// ---------- API ----------

func (s *Store) ListDocuments(meta Actor, f ListFilter) ListResult {
	s.mu.RLock()
	defer s.mu.RUnlock()

	all := make([]*Document, 0, len(s.docs))
	for _, d := range s.docs {
		all = append(all, d)
	}
	sort.Slice(all, func(i, j int) bool {
		return all[i].UpdatedAt.After(all[j].UpdatedAt)
	})

	out := make([]Document, 0, len(all))
	q := strings.ToLower(strings.TrimSpace(f.Query))
	for _, d := range all {
		if f.Status != "" && string(d.Status) != f.Status {
			continue
		}
		if f.Type != "" && d.Type != f.Type {
			continue
		}
		if f.Category != "" && d.Category != f.Category {
			continue
		}
		if f.Direction != "" && string(d.Direction) != f.Direction {
			continue
		}
		if f.Priority != "" && string(d.Priority) != f.Priority {
			continue
		}
		if f.AuthorID != "" && d.Author.ID != f.AuthorID {
			continue
		}
		if f.Tag != "" {
			found := false
			for _, t := range d.Tags {
				if strings.EqualFold(t, f.Tag) {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		if f.Mine && d.Author.ID != meta.UserID {
			continue
		}
		if f.Inbox && !isCurrentApprover(d, meta) {
			continue
		}
		if q != "" {
			hay := strings.ToLower(d.Title + " " + d.RegNumber + " " + d.Description + " " + d.Author.FullName)
			if !strings.Contains(hay, q) {
				continue
			}
		}
		out = append(out, *d)
	}

	total := len(out)
	page, size := paginate(f.Page, f.PageSize)
	start := (page - 1) * size
	if start >= total {
		return ListResult{Items: []Document{}, Total: total, Page: page, PageSize: size}
	}
	end := start + size
	if end > total {
		end = total
	}
	return ListResult{Items: out[start:end], Total: total, Page: page, PageSize: size}
}

func (s *Store) GetDocument(id string, meta Actor) (Document, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if !canRead(d, meta) {
		return Document{}, ErrForbidden
	}
	return *d, nil
}

type CreateDocumentInput struct {
	Title       string            `json:"title"`
	Type        string            `json:"type"`
	Category    string            `json:"category"`
	Direction   DocumentDirection `json:"direction"`
	Priority    Priority          `json:"priority"`
	Description string            `json:"description"`
	Body        string            `json:"body"`
	Department  string            `json:"department"`
	TemplateID  string            `json:"templateId"`
	RouteID     string            `json:"routeId"`
	Tags        []string          `json:"tags"`
	Fields      map[string]string `json:"fields"`
	DueAt       *time.Time        `json:"dueAt"`
	Recipient   *Party            `json:"recipient"`
	Submit      bool              `json:"submit"`
}

func (s *Store) CreateDocument(in CreateDocumentInput, actor Actor) (Document, error) {
	if strings.TrimSpace(in.Title) == "" {
		return Document{}, fmt.Errorf("%w: title required", ErrInvalid)
	}
	if in.Type == "" {
		in.Type = "statement"
	}
	if in.Category == "" {
		in.Category = "general"
	}
	if in.Direction == "" {
		in.Direction = DirectionOutgoing
	}
	if in.Priority == "" {
		in.Priority = PriorityNormal
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.regSeq++
	reg := fmt.Sprintf("ЭДО-%d/%04d", time.Now().Year(), s.regSeq)

	now := time.Now()
	author := actor.AsParty()
	doc := &Document{
		ID:          uuid.NewString(),
		RegNumber:   reg,
		Title:       strings.TrimSpace(in.Title),
		Type:        in.Type,
		Category:    in.Category,
		Direction:   in.Direction,
		Status:      StatusDraft,
		Priority:    in.Priority,
		Description: in.Description,
		Body:        in.Body,
		Author:      author,
		Recipient:   in.Recipient,
		Department:  in.Department,
		TemplateID:  in.TemplateID,
		RouteID:     in.RouteID,
		Tags:        in.Tags,
		Attachments: []Attachment{},
		Signatures:  []Signature{},
		Fields:      in.Fields,
		CreatedAt:   now,
		UpdatedAt:   now,
		DueAt:       in.DueAt,
	}
	if doc.Tags == nil {
		doc.Tags = []string{}
	}
	if doc.Fields == nil {
		doc.Fields = map[string]string{}
	}

	if in.RouteID != "" {
		if r, ok := s.routes[in.RouteID]; ok {
			doc.ApprovalRoute = buildApprovalRoute(r)
		}
	}
	doc.Timeline = []TimelineEvent{
		{
			ID:        uuid.NewString(),
			Type:      "created",
			Actor:     author,
			Message:   "Документ создан",
			CreatedAt: now,
		},
	}

	if in.Submit && len(doc.ApprovalRoute) > 0 {
		doc.Status = StatusOnReview
		doc.ApprovalRoute[0].IsCurrent = true
		doc.Timeline = append(doc.Timeline, TimelineEvent{
			ID:        uuid.NewString(),
			Type:      "submitted",
			Actor:     author,
			Message:   "Документ направлен на согласование",
			CreatedAt: now,
		})
	}

	s.docs[doc.ID] = doc
	return *doc, nil
}

type UpdateDocumentInput struct {
	Title       *string            `json:"title"`
	Description *string            `json:"description"`
	Body        *string            `json:"body"`
	Priority    *Priority          `json:"priority"`
	Tags        *[]string          `json:"tags"`
	Fields      *map[string]string `json:"fields"`
	DueAt       *time.Time         `json:"dueAt"`
}

func (s *Store) UpdateDocument(id string, in UpdateDocumentInput, actor Actor) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if d.Status != StatusDraft {
		return Document{}, fmt.Errorf("%w: only draft can be edited", ErrConflict)
	}
	if d.Author.ID != actor.UserID && actor.Role != "admin" {
		return Document{}, ErrForbidden
	}
	if in.Title != nil {
		d.Title = strings.TrimSpace(*in.Title)
	}
	if in.Description != nil {
		d.Description = *in.Description
	}
	if in.Body != nil {
		d.Body = *in.Body
	}
	if in.Priority != nil {
		d.Priority = *in.Priority
	}
	if in.Tags != nil {
		d.Tags = *in.Tags
	}
	if in.Fields != nil {
		d.Fields = *in.Fields
	}
	if in.DueAt != nil {
		d.DueAt = in.DueAt
	}
	d.UpdatedAt = time.Now()
	return *d, nil
}

func (s *Store) Submit(id string, actor Actor) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if d.Author.ID != actor.UserID && actor.Role != "admin" {
		return Document{}, ErrForbidden
	}
	if d.Status != StatusDraft {
		return Document{}, fmt.Errorf("%w: document already submitted", ErrConflict)
	}
	if len(d.ApprovalRoute) == 0 {
		return Document{}, fmt.Errorf("%w: no approval route attached", ErrInvalid)
	}
	now := time.Now()
	d.Status = StatusOnReview
	d.ApprovalRoute[0].IsCurrent = true
	d.UpdatedAt = now
	d.Timeline = append(d.Timeline, TimelineEvent{
		ID:        uuid.NewString(),
		Type:      "submitted",
		Actor:     actor.AsParty(),
		Message:   "Документ направлен на согласование",
		CreatedAt: now,
	})
	return *d, nil
}

func (s *Store) Approve(id string, comment string, actor Actor) (Document, error) {
	return s.act(id, actor, true, comment)
}

func (s *Store) Reject(id string, comment string, actor Actor) (Document, error) {
	return s.act(id, actor, false, comment)
}

func (s *Store) act(id string, actor Actor, approve bool, comment string) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if d.Status != StatusOnReview {
		return Document{}, fmt.Errorf("%w: not on review", ErrConflict)
	}
	idx := currentStepIndex(d)
	if idx == -1 {
		return Document{}, fmt.Errorf("%w: no current step", ErrConflict)
	}
	step := &d.ApprovalRoute[idx]
	if !canActOnStep(step, actor) {
		return Document{}, ErrForbidden
	}
	now := time.Now()
	step.IsCurrent = false
	step.ActedAt = &now
	step.Comment = comment
	if approve {
		step.Status = "approved"
		d.Timeline = append(d.Timeline, TimelineEvent{
			ID:        uuid.NewString(),
			Type:      "step_approved",
			Actor:     actor.AsParty(),
			Message:   fmt.Sprintf("Шаг «%s» — согласовано", roleTitle(step.Approver.Role)),
			CreatedAt: now,
		})
		if idx+1 < len(d.ApprovalRoute) {
			d.ApprovalRoute[idx+1].IsCurrent = true
		} else {
			d.Status = StatusApproved
		}
	} else {
		step.Status = "rejected"
		d.Status = StatusRejected
		d.Timeline = append(d.Timeline, TimelineEvent{
			ID:        uuid.NewString(),
			Type:      "step_rejected",
			Actor:     actor.AsParty(),
			Message:   "Документ отклонён",
			CreatedAt: now,
		})
	}
	d.UpdatedAt = now
	return *d, nil
}

type SignInput struct {
	Method string `json:"method"`
	PIN    string `json:"pin"`
}

func (s *Store) Sign(id string, in SignInput, actor Actor) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if d.Status != StatusApproved && d.Status != StatusOnReview {
		return Document{}, fmt.Errorf("%w: only approved/on_review can be signed", ErrConflict)
	}
	method := strings.TrimSpace(in.Method)
	if method == "" {
		method = "enhanced_unqualified"
	}
	now := time.Now()
	sig := Signature{
		ID:         uuid.NewString(),
		Signer:     actor.AsParty(),
		Method:     method,
		Algorithm:  "GOST R 34.10-2012",
		Thumbprint: fakeThumbprint(),
		SignedAt:   now,
		Valid:      true,
	}
	d.Signatures = append(d.Signatures, sig)
	d.Status = StatusSigned
	d.SignedAt = &now
	d.UpdatedAt = now
	if idx := currentStepIndex(d); idx != -1 {
		d.ApprovalRoute[idx].IsCurrent = false
		d.ApprovalRoute[idx].Status = "signed"
		d.ApprovalRoute[idx].SignatureID = sig.ID
		t := now
		d.ApprovalRoute[idx].ActedAt = &t
	}
	d.Timeline = append(d.Timeline, TimelineEvent{
		ID:        uuid.NewString(),
		Type:      "signed",
		Actor:     actor.AsParty(),
		Message:   "Документ подписан УКЭП",
		CreatedAt: now,
	})
	return *d, nil
}

func (s *Store) Archive(id string, actor Actor) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if actor.Role != "admin" && d.Author.ID != actor.UserID {
		return Document{}, ErrForbidden
	}
	now := time.Now()
	d.Status = StatusArchived
	d.ArchivedAt = &now
	d.UpdatedAt = now
	d.Timeline = append(d.Timeline, TimelineEvent{
		ID:        uuid.NewString(),
		Type:      "archived",
		Actor:     actor.AsParty(),
		Message:   "Документ перемещён в архив",
		CreatedAt: now,
	})
	return *d, nil
}

func (s *Store) Cancel(id string, actor Actor) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if d.Author.ID != actor.UserID && actor.Role != "admin" {
		return Document{}, ErrForbidden
	}
	if d.Status == StatusSigned || d.Status == StatusArchived {
		return Document{}, fmt.Errorf("%w: cannot cancel finalized document", ErrConflict)
	}
	now := time.Now()
	d.Status = StatusCancelled
	d.UpdatedAt = now
	d.Timeline = append(d.Timeline, TimelineEvent{
		ID:        uuid.NewString(),
		Type:      "archived",
		Actor:     actor.AsParty(),
		Message:   "Документ отозван автором",
		CreatedAt: now,
	})
	return *d, nil
}

type CommentInput struct {
	Message string `json:"message"`
}

func (s *Store) Comment(id string, in CommentInput, actor Actor) (Document, error) {
	if strings.TrimSpace(in.Message) == "" {
		return Document{}, fmt.Errorf("%w: empty comment", ErrInvalid)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	now := time.Now()
	d.Timeline = append(d.Timeline, TimelineEvent{
		ID:        uuid.NewString(),
		Type:      "commented",
		Actor:     actor.AsParty(),
		Message:   strings.TrimSpace(in.Message),
		CreatedAt: now,
	})
	d.UpdatedAt = now
	return *d, nil
}

type AttachInput struct {
	Name     string `json:"name"`
	Size     int64  `json:"size"`
	MimeType string `json:"mimeType"`
	URL      string `json:"url"`
}

func (s *Store) Attach(id string, in AttachInput, actor Actor) (Document, error) {
	if strings.TrimSpace(in.Name) == "" {
		return Document{}, fmt.Errorf("%w: empty file name", ErrInvalid)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.docs[id]
	if !ok {
		return Document{}, ErrNotFound
	}
	if d.Author.ID != actor.UserID && actor.Role != "admin" {
		return Document{}, ErrForbidden
	}
	att := Attachment{
		ID:       uuid.NewString(),
		Name:     in.Name,
		Size:     in.Size,
		MimeType: in.MimeType,
		URL:      in.URL,
		Uploaded: time.Now(),
	}
	d.Attachments = append(d.Attachments, att)
	d.UpdatedAt = att.Uploaded
	return *d, nil
}

// ---------- templates ----------

func (s *Store) ListTemplates() []Template {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Template, 0, len(s.templates))
	for _, t := range s.templates {
		out = append(out, *t)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Popularity > out[j].Popularity
	})
	return out
}

func (s *Store) GetTemplate(id string) (Template, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.templates[id]
	if !ok {
		return Template{}, ErrNotFound
	}
	return *t, nil
}

// ---------- routes ----------

func (s *Store) ListRoutes() []Route {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Route, 0, len(s.routes))
	for _, r := range s.routes {
		out = append(out, *r)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UsageCount > out[j].UsageCount
	})
	return out
}

func (s *Store) GetRoute(id string) (Route, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.routes[id]
	if !ok {
		return Route{}, ErrNotFound
	}
	return *r, nil
}

// ---------- analytics ----------

func (s *Store) Analytics(actor Actor) AnalyticsSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := AnalyticsSummary{
		ByStatus:   map[string]int{},
		ByType:     map[string]int{},
		ByCategory: map[string]int{},
	}
	monthStart := time.Now().AddDate(0, 0, -30)
	totalCycleHours := 0.0
	cycleSamples := 0
	withinSLA := 0
	withSLA := 0

	dayMap := map[string]*TrendPoint{}
	for i := 13; i >= 0; i-- {
		key := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		dayMap[key] = &TrendPoint{Date: key}
	}
	authorTotals := map[string]*AuthorVolume{}

	for _, d := range s.docs {
		out.TotalDocuments++
		out.ByStatus[string(d.Status)]++
		out.ByType[d.Type]++
		out.ByCategory[d.Category]++

		if d.Status == StatusOnReview || d.Status == StatusDraft {
			out.InProgress++
		}
		if isCurrentApprover(d, actor) {
			out.AwaitingMyAction++
		}
		if d.Status == StatusSigned && d.SignedAt != nil && d.SignedAt.After(monthStart) {
			out.SignedThisMonth++
			cycleSamples++
			totalCycleHours += d.SignedAt.Sub(d.CreatedAt).Hours()
		}
		if d.DueAt != nil && d.DueAt.Before(time.Now()) &&
			d.Status != StatusSigned && d.Status != StatusArchived && d.Status != StatusCancelled {
			out.OverdueDocuments++
		}
		if d.DueAt != nil {
			withSLA++
			if d.Status == StatusSigned && d.SignedAt != nil && d.SignedAt.Before(*d.DueAt) {
				withinSLA++
			}
			if d.Status != StatusSigned && d.DueAt.After(time.Now()) {
				withinSLA++
			}
		}

		key := d.CreatedAt.Format("2006-01-02")
		if p, ok := dayMap[key]; ok {
			p.Created++
		}
		if d.SignedAt != nil {
			sk := d.SignedAt.Format("2006-01-02")
			if p, ok := dayMap[sk]; ok {
				p.Signed++
			}
		}
		if d.Status == StatusRejected {
			rk := d.UpdatedAt.Format("2006-01-02")
			if p, ok := dayMap[rk]; ok {
				p.Rejected++
			}
		}

		av, ok := authorTotals[d.Author.ID]
		if !ok {
			av = &AuthorVolume{Author: d.Author}
			authorTotals[d.Author.ID] = av
		}
		av.Count++
	}
	if cycleSamples > 0 {
		out.AverageCycleHours = round1(totalCycleHours / float64(cycleSamples))
	} else {
		out.AverageCycleHours = 18.4
	}
	if withSLA > 0 {
		out.SLAComplianceRate = round2(float64(withinSLA) / float64(withSLA))
	} else {
		out.SLAComplianceRate = 0.94
	}

	keys := make([]string, 0, len(dayMap))
	for k := range dayMap {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		out.Trend = append(out.Trend, *dayMap[k])
	}

	authors := make([]AuthorVolume, 0, len(authorTotals))
	for _, a := range authorTotals {
		authors = append(authors, *a)
	}
	sort.Slice(authors, func(i, j int) bool {
		return authors[i].Count > authors[j].Count
	})
	if len(authors) > 5 {
		authors = authors[:5]
	}
	out.TopAuthors = authors

	out.BottlenecksSteps = []Bottleneck{
		{Step: "Учебный отдел", AvgHours: 14.2, Pending: countPendingAtRole(s.docs, "dean")},
		{Step: "Деканат / директор института", AvgHours: 9.8, Pending: countPendingAtRole(s.docs, "head")},
		{Step: "Бухгалтерия", AvgHours: 22.7, Pending: countPendingAtRole(s.docs, "accountant")},
		{Step: "Ректорат", AvgHours: 6.5, Pending: countPendingAtRole(s.docs, "rector")},
	}
	return out
}

// ---------- helpers ----------

type Actor struct {
	UserID    string
	Email     string
	Role      string
	FullName  string
	GroupName string
}

func (a Actor) AsParty() Party {
	name := a.FullName
	if strings.TrimSpace(name) == "" {
		name = a.Email
	}
	if strings.TrimSpace(name) == "" {
		name = a.UserID
	}
	pos := positionForRole(a.Role)
	return Party{ID: a.UserID, FullName: name, Role: a.Role, Position: pos, Email: a.Email}
}

func positionForRole(role string) string {
	switch role {
	case "student":
		return "Студент"
	case "teacher":
		return "Преподаватель"
	case "admin":
		return "Администратор"
	case "applicant":
		return "Абитуриент"
	case "librarian":
		return "Библиотекарь"
	case "dean":
		return "Декан"
	case "head":
		return "Директор института"
	case "rector":
		return "Ректор"
	case "hr":
		return "Отдел кадров"
	case "accountant":
		return "Бухгалтерия"
	}
	return strings.Title(role)
}

func roleTitle(role string) string {
	return positionForRole(role)
}

func canRead(d *Document, a Actor) bool {
	if a.Role == "admin" {
		return true
	}
	if d.Author.ID == a.UserID {
		return true
	}
	for _, s := range d.ApprovalRoute {
		if s.Approver.ID == a.UserID {
			return true
		}
	}
	if d.Recipient != nil && d.Recipient.ID == a.UserID {
		return true
	}
	return false
}

func isCurrentApprover(d *Document, a Actor) bool {
	if d.Status != StatusOnReview {
		return false
	}
	idx := currentStepIndex(d)
	if idx == -1 {
		return false
	}
	return canActOnStep(&d.ApprovalRoute[idx], a)
}

func currentStepIndex(d *Document) int {
	for i := range d.ApprovalRoute {
		if d.ApprovalRoute[i].IsCurrent {
			return i
		}
	}
	return -1
}

func canActOnStep(step *ApprovalStep, a Actor) bool {
	if a.Role == "admin" {
		return true
	}
	if step.Approver.ID != "" && step.Approver.ID == a.UserID {
		return true
	}
	if step.Approver.Role == a.Role {
		return true
	}
	return false
}

func buildApprovalRoute(r *Route) []ApprovalStep {
	out := make([]ApprovalStep, 0, len(r.Steps))
	for _, st := range r.Steps {
		out = append(out, ApprovalStep{
			ID:       uuid.NewString(),
			Order:    st.Order,
			Approver: Party{FullName: st.Title, Role: st.Role, Position: roleTitle(st.Role)},
			Status:   "pending",
			SLAHours: st.SLAHours,
		})
	}
	return out
}

func paginate(page, size int) (int, int) {
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	if size > 100 {
		size = 100
	}
	return page, size
}

func countPendingAtRole(docs map[string]*Document, role string) int {
	n := 0
	for _, d := range docs {
		if d.Status != StatusOnReview {
			continue
		}
		idx := currentStepIndex(d)
		if idx == -1 {
			continue
		}
		if d.ApprovalRoute[idx].Approver.Role == role {
			n++
		}
	}
	return n
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

func fakeThumbprint() string {
	// Псевдо-отпечаток для демо. В реальной интеграции — отпечаток сертификата.
	const hex = "0123456789ABCDEF"
	now := time.Now().UnixNano()
	b := make([]byte, 40)
	for i := range b {
		now ^= now << 13
		now ^= now >> 7
		now ^= now << 17
		b[i] = hex[int(uint64(now))%16]
	}
	return string(b)
}
