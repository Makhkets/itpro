package security

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// IPIntel holds geolocation and threat intelligence for an IP address.
type IPIntel struct {
	IP          string  `json:"ip"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	Region      string  `json:"region"`
	City        string  `json:"city"`
	ISP         string  `json:"isp"`
	Org         string  `json:"org"`
	AS          string  `json:"as"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Timezone    string  `json:"timezone"`
	IsVPN       bool    `json:"isVpn"`
	IsProxy     bool    `json:"isProxy"`
	IsTor       bool    `json:"isTor"`
	IsHosting   bool    `json:"isHosting"`
}

// IPIntelService resolves IP addresses to geolocation and threat data.
type IPIntelService struct {
	redis  *redis.Client
	http   *http.Client
	ttl    time.Duration
}

func NewIPIntelService(redisClient *redis.Client) *IPIntelService {
	return &IPIntelService{
		redis: redisClient,
		http:  &http.Client{Timeout: 5 * time.Second},
		ttl:   24 * time.Hour,
	}
}

const redisPrefixIPIntel = "ipintel:"

func (s *IPIntelService) Lookup(ctx context.Context, ip string) IPIntel {
	ip = strings.TrimSpace(ip)
	if ip == "" || isPrivateIP(ip) {
		return IPIntel{
			IP:      ip,
			Country: "Local",
			City:    "Local Network",
			ISP:     "Private",
		}
	}

	// Check Redis cache first
	if s.redis != nil {
		cached, err := s.redis.Get(ctx, redisPrefixIPIntel+ip).Result()
		if err == nil && cached != "" {
			var intel IPIntel
			if json.Unmarshal([]byte(cached), &intel) == nil {
				return intel
			}
		}
	}

	// Call ip-api.com (free, 45 req/min, includes proxy detection)
	intel := s.queryIPAPI(ctx, ip)

	// Cache the result
	if s.redis != nil {
		if data, err := json.Marshal(intel); err == nil {
			_ = s.redis.Set(ctx, redisPrefixIPIntel+ip, string(data), s.ttl).Err()
		}
	}

	return intel
}

// ipAPIResponse mirrors the ip-api.com JSON response for the pro-like fields endpoint.
type ipAPIResponse struct {
	Status      string  `json:"status"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	Region      string  `json:"region"`
	RegionName  string  `json:"regionName"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Timezone    string  `json:"timezone"`
	ISP         string  `json:"isp"`
	Org         string  `json:"org"`
	AS          string  `json:"as"`
	Proxy       bool    `json:"proxy"`
	Hosting     bool    `json:"hosting"`
	Query       string  `json:"query"`
}

func (s *IPIntelService) queryIPAPI(ctx context.Context, ip string) IPIntel {
	// ip-api.com free endpoint with proxy/hosting fields
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,proxy,hosting,query", ip)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return IPIntel{IP: ip}
	}

	resp, err := s.http.Do(req)
	if err != nil {
		return IPIntel{IP: ip}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return IPIntel{IP: ip}
	}

	var apiResp ipAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil || apiResp.Status != "success" {
		return IPIntel{IP: ip}
	}

	intel := IPIntel{
		IP:          ip,
		Country:     apiResp.Country,
		CountryCode: apiResp.CountryCode,
		Region:      apiResp.RegionName,
		City:        apiResp.City,
		ISP:         apiResp.ISP,
		Org:         apiResp.Org,
		AS:          apiResp.AS,
		Lat:         apiResp.Lat,
		Lon:         apiResp.Lon,
		Timezone:    apiResp.Timezone,
		IsProxy:     apiResp.Proxy,
		IsHosting:   apiResp.Hosting,
	}

	// Heuristic VPN detection: if proxy or hosting datacenter
	intel.IsVPN = detectVPN(intel)
	// Heuristic Tor detection
	intel.IsTor = detectTor(intel)

	return intel
}

func detectVPN(intel IPIntel) bool {
	if intel.IsProxy || intel.IsHosting {
		return true
	}
	lowerOrg := strings.ToLower(intel.Org)
	lowerISP := strings.ToLower(intel.ISP)
	vpnKeywords := []string{"vpn", "tunnel", "private internet", "mullvad", "nordvpn", "expressvpn",
		"surfshark", "cyberghost", "protonvpn", "windscribe", "hide.me", "pia", "ivpn"}
	for _, kw := range vpnKeywords {
		if strings.Contains(lowerOrg, kw) || strings.Contains(lowerISP, kw) {
			return true
		}
	}
	return false
}

func detectTor(intel IPIntel) bool {
	lowerOrg := strings.ToLower(intel.Org)
	lowerISP := strings.ToLower(intel.ISP)
	torKeywords := []string{"tor exit", "tor relay", "tor project", "tor network"}
	for _, kw := range torKeywords {
		if strings.Contains(lowerOrg, kw) || strings.Contains(lowerISP, kw) {
			return true
		}
	}
	return false
}

func isPrivateIP(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	if parsed.IsLoopback() || parsed.IsPrivate() || parsed.IsLinkLocalUnicast() || parsed.IsLinkLocalMulticast() {
		return true
	}
	return false
}

// ThreatFlags returns a list of threat type strings for this intel.
func (i IPIntel) ThreatFlags() []string {
	var flags []string
	if i.IsVPN {
		flags = append(flags, "vpn")
	}
	if i.IsProxy {
		flags = append(flags, "proxy")
	}
	if i.IsTor {
		flags = append(flags, "tor")
	}
	if i.IsHosting {
		flags = append(flags, "hosting")
	}
	return flags
}

// HasThreat returns true if any IP threat flag is set.
func (i IPIntel) HasThreat() bool {
	return i.IsVPN || i.IsProxy || i.IsTor || i.IsHosting
}
