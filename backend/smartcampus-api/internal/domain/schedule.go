package domain

import "time"

type Schedule struct {
	ID           string    `json:"id"`
	RoomID       string    `json:"roomId"`
	RoomNumber   string    `json:"roomNumber,omitempty"`
	Room         *Room     `json:"room,omitempty"`
	Title        string    `json:"title"`
	TeacherID    string    `json:"teacherId,omitempty"`
	TeacherName  string    `json:"teacherName,omitempty"`
	GroupName    string    `json:"groupName,omitempty"`
	StartsAt     time.Time `json:"startsAt"`
	EndsAt       time.Time `json:"endsAt"`
	Source       string    `json:"source"`
	CreatedBy    string    `json:"createdBy,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type ScheduleCurrent struct {
	Now           time.Time `json:"now"`
	CurrentLesson *Schedule `json:"currentLesson"`
	NextLesson    *Schedule `json:"nextLesson"`
}

type TimeSlot struct {
	StartsAt time.Time `json:"startsAt"`
	EndsAt   time.Time `json:"endsAt"`
	Title    string    `json:"title,omitempty"`
	Source   string    `json:"source,omitempty"`
}

type RoomAvailability struct {
	Date        string     `json:"date"`
	WorkingFrom string     `json:"workingFrom"`
	WorkingTo   string     `json:"workingTo"`
	BusySlots   []TimeSlot `json:"busySlots"`
	FreeSlots   []TimeSlot `json:"freeSlots"`
}
