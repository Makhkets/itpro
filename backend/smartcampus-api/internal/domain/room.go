package domain

import "time"

type Room struct {
	ID              string    `json:"id"`
	BuildingID      string    `json:"buildingId"`
	FloorID         string    `json:"floorId"`
	Building        *Building `json:"building,omitempty"`
	Floor           *Floor    `json:"floor,omitempty"`
	Number          string    `json:"number"`
	Name            string    `json:"name,omitempty"`
	Type            string    `json:"type"`
	Capacity        int       `json:"capacity"`
	Description     string    `json:"description,omitempty"`
	Equipment       []string  `json:"equipment"`
	NavigationHint  string    `json:"navigationHint,omitempty"`
	NearbyLandmarks string    `json:"nearbyLandmarks,omitempty"`
	IsBookable      bool      `json:"isBookable"`
	IsActive        bool      `json:"isActive"`
	XCoord          *int      `json:"xCoord,omitempty"`
	YCoord          *int      `json:"yCoord,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type RoomSearchFilter struct {
	Query       string
	BuildingID  string
	FloorID     string
	Type        string
	Equipment   string
	CapacityMin int
	Page        int
	PageSize    int
}

type RoomNavigation struct {
	Building        Building `json:"building"`
	Floor           Floor    `json:"floor"`
	Room            Room     `json:"room"`
	NavigationHint  string   `json:"navigationHint"`
	NearbyLandmarks string   `json:"nearbyLandmarks,omitempty"`
	MapImageURL     string   `json:"mapImageUrl,omitempty"`
	XCoord          *int     `json:"xCoord,omitempty"`
	YCoord          *int     `json:"yCoord,omitempty"`
}
