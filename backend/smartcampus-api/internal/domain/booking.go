package domain

import "time"

type Booking struct {
	ID           string     `json:"id"`
	RoomID       string     `json:"roomId"`
	Room         *Room      `json:"room,omitempty"`
	RequestedBy  string     `json:"requestedBy"`
	Title        string     `json:"title"`
	Purpose      string     `json:"purpose"`
	BookingType  string     `json:"bookingType"`
	StartsAt     time.Time  `json:"startsAt"`
	EndsAt       time.Time  `json:"endsAt"`
	Status       string     `json:"status"`
	AdminComment string     `json:"adminComment,omitempty"`
	ReviewedBy   string     `json:"reviewedBy,omitempty"`
	ReviewedAt   *time.Time `json:"reviewedAt,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}
