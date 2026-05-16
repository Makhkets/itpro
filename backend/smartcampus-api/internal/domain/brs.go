package domain

// BRSGrade represents a single grade entry from ISU BRS system.
type BRSGrade struct {
	DisciplineID    int     `json:"disciplineId"`
	DisciplineName  string  `json:"disciplineName"`
	TeacherName     string  `json:"teacherName"`
	Att1Current     float64 `json:"att1Current"`
	Att1Border      float64 `json:"att1Border"`
	Att2Current     float64 `json:"att2Current"`
	Att2Border      float64 `json:"att2Border"`
	Attendance      float64 `json:"attendance"`
	IndependentWork float64 `json:"independentWork"`
	Retake          float64 `json:"retake"`
	Bonus           float64 `json:"bonus"`
	Total           float64 `json:"total"`
	ExamType        string  `json:"examType"`
	IsOpen1         bool    `json:"isOpen1"`
	IsOpen2         bool    `json:"isOpen2"`
}

// BRSJournalEntry represents a single attendance/grade record for a lesson.
type BRSJournalEntry struct {
	PK       int     `json:"pk"`
	Attended bool    `json:"attended"`
	Date     string  `json:"date"`
	Grade    float64 `json:"grade"`
}

// BRSResult is the response returned for a BRS grades request.
type BRSResult struct {
	Grades      []BRSGrade `json:"grades"`
	SemesterNum int        `json:"semesterNum"`
	YearStart   int        `json:"yearStart"`
	YearEnd     int        `json:"yearEnd"`
	Error       string     `json:"error,omitempty"`
}
