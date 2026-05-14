package domain

import "time"

type Floor struct {
	ID          string    `json:"id"`
	BuildingID  string    `json:"buildingId"`
	Number      int       `json:"number"`
	Name        string    `json:"name,omitempty"`
	MapImageURL string    `json:"mapImageUrl,omitempty"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
