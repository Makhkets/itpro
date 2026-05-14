package security

import "testing"

func TestPasswordHashing(t *testing.T) {
	hash, err := HashPassword("Student123!")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if hash == "Student123!" {
		t.Fatal("password hash must not equal plaintext")
	}
	if !CheckPassword("Student123!", hash) {
		t.Fatal("expected password to match hash")
	}
	if CheckPassword("Wrong123!", hash) {
		t.Fatal("wrong password must not match hash")
	}
}
