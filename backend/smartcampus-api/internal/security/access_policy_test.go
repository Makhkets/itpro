package security

import "testing"

import "github.com/stretchr/testify/require"

func TestRoleAllowed(t *testing.T) {
	require.True(t, RoleAllowed("admin", "admin"))
	require.False(t, RoleAllowed("student", "admin", "librarian"))
}
