package domain

import "time"

type User struct {
	ID                  string    `json:"id"`
	FullName            string    `json:"fullName"`
	Email               string    `json:"email,omitempty"`
	PasswordHash        string    `json:"-"`
	Role                string    `json:"role"`
	GroupName           string    `json:"groupName,omitempty"`
	Department          string    `json:"department,omitempty"`
	TelegramChatID      *int64    `json:"telegramChatId,omitempty"`
	TelegramUsername    string    `json:"telegramUsername,omitempty"`
	IsTelegramVerified  bool      `json:"isTelegramVerified"`
	PersonalDataConsent bool      `json:"personalDataConsent"`
	IsActive            bool      `json:"isActive"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type PublicUser struct {
	ID         string `json:"id"`
	FullName   string `json:"fullName"`
	Role       string `json:"role"`
	GroupName  string `json:"groupName,omitempty"`
	Department string `json:"department,omitempty"`
}
