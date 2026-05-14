package domain

import "time"

type AuditLog struct {
	ID         string         `json:"id"`
	UserID     string         `json:"userId,omitempty"`
	Action     string         `json:"action"`
	EntityType string         `json:"entityType"`
	EntityID   string         `json:"entityId,omitempty"`
	IPAddress  string         `json:"ipAddress,omitempty"`
	UserAgent  string         `json:"userAgent,omitempty"`
	Metadata   map[string]any `json:"metadata"`
	CreatedAt  time.Time      `json:"createdAt"`
}

type PersonalDataEvent struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	EventType   string    `json:"eventType"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
}
