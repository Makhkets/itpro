package domain

import "time"

type LibraryBook struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Author          string    `json:"author,omitempty"`
	ISBN            string    `json:"isbn,omitempty"`
	Category        string    `json:"category,omitempty"`
	Description     string    `json:"description,omitempty"`
	TotalCopies     int       `json:"totalCopies"`
	AvailableCopies int       `json:"availableCopies"`
	Location        string    `json:"location,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type LibraryLoan struct {
	ID         string       `json:"id"`
	BookID     string       `json:"bookId"`
	Book       *LibraryBook `json:"book,omitempty"`
	UserID     string       `json:"userId"`
	IssuedBy   string       `json:"issuedBy"`
	ReturnedBy string       `json:"returnedBy,omitempty"`
	Status     string       `json:"status"`
	IssuedAt   time.Time    `json:"issuedAt"`
	DueAt      time.Time    `json:"dueAt"`
	ReturnedAt *time.Time   `json:"returnedAt,omitempty"`
}

type LibrarySummary struct {
	TotalBooks      int `json:"totalBooks"`
	AvailableCopies int `json:"availableCopies"`
	ActiveLoans     int `json:"activeLoans"`
	OverdueLoans    int `json:"overdueLoans"`
}
