package validator

import (
	"fmt"

	playground "github.com/go-playground/validator/v10"
)

type Validator struct {
	v *playground.Validate
}

func New() *Validator {
	return &Validator{v: playground.New()}
}

func (v *Validator) Struct(value any) map[string]string {
	if err := v.v.Struct(value); err != nil {
		out := map[string]string{}
		for _, fieldErr := range err.(playground.ValidationErrors) {
			out[fieldErr.Field()] = fmt.Sprintf("failed %s validation", fieldErr.Tag())
		}
		return out
	}
	return nil
}

func ValidRole(role string) bool {
	switch role {
	case "student", "teacher", "applicant", "librarian", "admin":
		return true
	default:
		return false
	}
}

func ValidRoomType(value string) bool {
	switch value {
	case "lecture", "computer_lab", "coworking", "meeting", "office", "library", "lab", "other":
		return true
	default:
		return false
	}
}

func ValidBookingType(value string) bool {
	switch value {
	case "meeting", "consultation", "lesson", "event", "project_work", "other":
		return true
	default:
		return false
	}
}
