package domain

import "time"

type Notification struct {
	ID         string     `json:"id"`
	UserID     string     `json:"userId"`
	Type       string     `json:"type"`
	Channel    string     `json:"channel"`
	Title      string     `json:"title"`
	Message    string     `json:"message"`
	IsRead     bool       `json:"isRead"`
	IsSent     bool       `json:"isSent"`
	SentAt     *time.Time `json:"sentAt,omitempty"`
	EntityType string     `json:"entityType,omitempty"`
	EntityID   string     `json:"entityId,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
}
