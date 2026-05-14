package domain

import "time"

type AIChatSession struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type AIChatMessage struct {
	ID        string    `json:"id"`
	SessionID string    `json:"sessionId"`
	UserID    string    `json:"userId"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type AISource struct {
	Type  string `json:"type"`
	ID    string `json:"id"`
	Title string `json:"title"`
}

type AIAnswer struct {
	SessionID string     `json:"sessionId"`
	Answer    string     `json:"answer"`
	Sources   []AISource `json:"sources"`
}
