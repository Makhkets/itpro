package domain

import "time"

type TelegramLink struct {
	ID               string     `json:"id"`
	UserID           string     `json:"userId"`
	ChatID           int64      `json:"chatId"`
	Username         string     `json:"username,omitempty"`
	VerificationCode string     `json:"verificationCode,omitempty"`
	IsVerified       bool       `json:"isVerified"`
	CreatedAt        time.Time  `json:"createdAt"`
	VerifiedAt       *time.Time `json:"verifiedAt,omitempty"`
}
