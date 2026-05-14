package validator

import "testing"

func TestEnums(t *testing.T) {
	if !ValidRole("student") || !ValidRole("admin") || ValidRole("root") {
		t.Fatal("role enum validation failed")
	}
	if !ValidRoomType("computer_lab") || ValidRoomType("cinema") {
		t.Fatal("room type enum validation failed")
	}
	if !ValidBookingType("consultation") || ValidBookingType("party") {
		t.Fatal("booking type enum validation failed")
	}
}
