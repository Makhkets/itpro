package domain

import "time"

type AuditLog struct {
	ID          string         `json:"id"`
	UserID      string         `json:"userId,omitempty"`
	Action      string         `json:"action"`
	EntityType  string         `json:"entityType"`
	EntityID    string         `json:"entityId,omitempty"`
	IPAddress   string         `json:"ipAddress,omitempty"`
	UserAgent   string         `json:"userAgent,omitempty"`
	Metadata    map[string]any `json:"metadata"`
	Country     string         `json:"country,omitempty"`
	CountryCode string         `json:"countryCode,omitempty"`
	City        string         `json:"city,omitempty"`
	Region      string         `json:"region,omitempty"`
	ISP         string         `json:"isp,omitempty"`
	Org         string         `json:"org,omitempty"`
	ASNumber    string         `json:"asNumber,omitempty"`
	IsVPN       bool           `json:"isVpn"`
	IsProxy     bool           `json:"isProxy"`
	IsTor       bool           `json:"isTor"`
	IsHosting   bool           `json:"isHosting"`
	ThreatLevel string         `json:"threatLevel"`
	ThreatTypes []string       `json:"threatTypes"`
	Latitude    *float64       `json:"latitude,omitempty"`
	Longitude   *float64       `json:"longitude,omitempty"`
	Timezone    string         `json:"timezone,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
}

type SecurityAlert struct {
	ID          string         `json:"id"`
	AuditLogID  string         `json:"auditLogId,omitempty"`
	UserID      string         `json:"userId,omitempty"`
	AlertType   string         `json:"alertType"`
	Severity    string         `json:"severity"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	IPAddress   string         `json:"ipAddress,omitempty"`
	Country     string         `json:"country,omitempty"`
	City        string         `json:"city,omitempty"`
	Metadata    map[string]any `json:"metadata"`
	IsResolved  bool           `json:"isResolved"`
	ResolvedBy  string         `json:"resolvedBy,omitempty"`
	ResolvedAt  *time.Time     `json:"resolvedAt,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
}

type SecurityDashboard struct {
	TotalEvents       int            `json:"totalEvents"`
	EventsLast24h     int            `json:"eventsLast24h"`
	UniqueIPs24h      int            `json:"uniqueIPs24h"`
	UniqueUsers24h    int            `json:"uniqueUsers24h"`
	FailedLogins24h   int            `json:"failedLogins24h"`
	VPNAccesses24h    int            `json:"vpnAccesses24h"`
	ProxyAccesses24h  int            `json:"proxyAccesses24h"`
	TorAccesses24h    int            `json:"torAccesses24h"`
	ThreatsByLevel    map[string]int `json:"threatsByLevel"`
	TopCountries      []CountStat    `json:"topCountries"`
	TopISPs           []CountStat    `json:"topISPs"`
	RecentAlerts      []SecurityAlert `json:"recentAlerts"`
	UnresolvedAlerts  int            `json:"unresolvedAlerts"`
}

type CountStat struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type PersonalDataEvent struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	EventType   string    `json:"eventType"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
}
