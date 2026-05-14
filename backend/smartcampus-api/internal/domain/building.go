package domain

import "time"

type Building struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Code           string    `json:"code"`
	Address        string    `json:"address,omitempty"`
	Description    string    `json:"description,omitempty"`
	Latitude       *float64  `json:"latitude,omitempty"`
	Longitude      *float64  `json:"longitude,omitempty"`
	IsOldBuilding  bool      `json:"isOldBuilding"`
	NavigationMode string    `json:"navigationMode"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type CampusRoute struct {
	ID                 string    `json:"id"`
	FromBuildingID     string    `json:"fromBuildingId"`
	ToBuildingID       string    `json:"toBuildingId"`
	FromBuilding       *Building `json:"fromBuilding,omitempty"`
	ToBuilding         *Building `json:"toBuilding,omitempty"`
	Title              string    `json:"title,omitempty"`
	Description        string    `json:"description"`
	EstimatedMinutes   int       `json:"estimatedMinutes"`
	DistanceMeters     *int      `json:"distanceMeters,omitempty"`
	RouteType          string    `json:"routeType"`
	AccessibilityNotes string    `json:"accessibilityNotes,omitempty"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}
