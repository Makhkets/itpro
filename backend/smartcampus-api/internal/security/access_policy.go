package security

func RoleAllowed(role string, allowed ...string) bool {
	for _, item := range allowed {
		if role == item {
			return true
		}
	}
	return false
}
