package security

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// ThreatDetector analyses behavioral patterns to detect suspicious activity.
type ThreatDetector struct {
	redis *redis.Client
}

func NewThreatDetector(redisClient *redis.Client) *ThreatDetector {
	return &ThreatDetector{redis: redisClient}
}

// ThreatResult holds the analysis result for a single audit event.
type ThreatResult struct {
	Level   string   // none, low, medium, high, critical
	Types   []string // brute_force, impossible_travel, suspicious_ua, multi_ip, vpn_proxy, tor, off_hours, new_country
	Alerts  []ThreatAlert
}

type ThreatAlert struct {
	Type        string
	Severity    string
	Title       string
	Description string
	Metadata    map[string]any
}

const (
	ThreatNone     = "none"
	ThreatLow      = "low"
	ThreatMedium   = "medium"
	ThreatHigh     = "high"
	ThreatCritical = "critical"
)

// Analyse runs all threat detection heuristics for a given action.
func (d *ThreatDetector) Analyse(ctx context.Context, userID, ip, userAgent, action string, intel IPIntel) ThreatResult {
	result := ThreatResult{Level: ThreatNone}

	// 1. VPN / Proxy / Tor detection
	d.checkIPThreats(&result, intel, userID, action)

	// 2. Brute force detection (failed logins)
	d.checkBruteForce(ctx, &result, ip, userID, action)

	// 3. Suspicious User-Agent
	d.checkSuspiciousUA(&result, userAgent, userID, action)

	// 4. Multiple IPs per user in short window
	d.checkMultiIP(ctx, &result, userID, ip, action)

	// 5. Impossible travel
	d.checkImpossibleTravel(ctx, &result, userID, intel, action)

	// 6. Off-hours activity (sensitive actions outside 6:00-23:00 MSK)
	d.checkOffHours(&result, userID, action)

	// 7. New country for user
	d.checkNewCountry(ctx, &result, userID, intel, action)

	// Compute overall threat level
	result.Level = d.computeLevel(result.Types)

	// Record this event for future analysis
	d.recordEvent(ctx, userID, ip, intel)

	return result
}

func (d *ThreatDetector) checkIPThreats(result *ThreatResult, intel IPIntel, userID, action string) {
	if intel.IsTor {
		result.Types = append(result.Types, "tor")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:     "tor",
			Severity: ThreatHigh,
			Title:    "Tor Exit Node Detected",
			Description: fmt.Sprintf("User %s accessed via Tor network from %s (%s). Action: %s",
				truncID(userID), intel.IP, intel.Country, action),
			Metadata: map[string]any{"ip": intel.IP, "country": intel.Country, "isp": intel.ISP},
		})
	}
	if intel.IsProxy && !intel.IsTor {
		result.Types = append(result.Types, "proxy")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:     "proxy",
			Severity: ThreatMedium,
			Title:    "Proxy Detected",
			Description: fmt.Sprintf("User %s accessed via proxy (%s, %s). Action: %s",
				truncID(userID), intel.ISP, intel.Country, action),
			Metadata: map[string]any{"ip": intel.IP, "isp": intel.ISP},
		})
	}
	if intel.IsVPN && !intel.IsTor && !intel.IsProxy {
		result.Types = append(result.Types, "vpn")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:     "vpn",
			Severity: ThreatLow,
			Title:    "VPN/Datacenter IP Detected",
			Description: fmt.Sprintf("User %s connected from VPN/datacenter (%s, %s, %s). Action: %s",
				truncID(userID), intel.Org, intel.ISP, intel.Country, action),
			Metadata: map[string]any{"ip": intel.IP, "org": intel.Org, "isp": intel.ISP},
		})
	}
}

func (d *ThreatDetector) checkBruteForce(ctx context.Context, result *ThreatResult, ip, userID, action string) {
	if action != "failed_login" || d.redis == nil {
		return
	}

	key := fmt.Sprintf("threat:brute:%s", ip)
	count, _ := d.redis.Incr(ctx, key).Result()
	if count == 1 {
		_ = d.redis.Expire(ctx, key, 15*time.Minute).Err()
	}

	if count >= 5 {
		severity := ThreatMedium
		if count >= 10 {
			severity = ThreatHigh
		}
		if count >= 20 {
			severity = ThreatCritical
		}
		result.Types = append(result.Types, "brute_force")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:        "brute_force",
			Severity:    severity,
			Title:       "Brute Force Attack Detected",
			Description: fmt.Sprintf("IP %s has %d failed login attempts in last 15 minutes", ip, count),
			Metadata:    map[string]any{"ip": ip, "attempts": count},
		})
	}
}

func (d *ThreatDetector) checkSuspiciousUA(result *ThreatResult, ua, userID, action string) {
	if ua == "" {
		result.Types = append(result.Types, "suspicious_ua")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:        "suspicious_ua",
			Severity:    ThreatMedium,
			Title:       "Empty User-Agent",
			Description: fmt.Sprintf("User %s sent request with empty User-Agent. Action: %s", truncID(userID), action),
		})
		return
	}

	lower := strings.ToLower(ua)
	suspiciousPatterns := []string{"curl", "wget", "python-requests", "httpie", "postman",
		"scanner", "nikto", "sqlmap", "nmap", "masscan", "dirbuster", "gobuster",
		"burpsuite", "zaproxy", "nuclei", "ffuf"}
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lower, pattern) {
			result.Types = append(result.Types, "suspicious_ua")
			result.Alerts = append(result.Alerts, ThreatAlert{
				Type:        "suspicious_ua",
				Severity:    ThreatMedium,
				Title:       "Suspicious User-Agent",
				Description: fmt.Sprintf("User %s using suspicious tool: %s. Action: %s", truncID(userID), ua, action),
				Metadata:    map[string]any{"userAgent": ua, "pattern": pattern},
			})
			return
		}
	}
}

func (d *ThreatDetector) checkMultiIP(ctx context.Context, result *ThreatResult, userID, ip, action string) {
	if userID == "" || d.redis == nil {
		return
	}

	key := fmt.Sprintf("threat:ips:%s", userID)
	_ = d.redis.SAdd(ctx, key, ip).Err()
	_ = d.redis.Expire(ctx, key, 1*time.Hour).Err()
	count, _ := d.redis.SCard(ctx, key).Result()

	if count >= 4 {
		result.Types = append(result.Types, "multi_ip")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:        "multi_ip",
			Severity:    ThreatMedium,
			Title:       "Multiple IPs for Single User",
			Description: fmt.Sprintf("User %s accessed from %d different IPs in last hour", truncID(userID), count),
			Metadata:    map[string]any{"userId": userID, "ipCount": count},
		})
	}
}

func (d *ThreatDetector) checkImpossibleTravel(ctx context.Context, result *ThreatResult, userID string, intel IPIntel, action string) {
	if userID == "" || d.redis == nil || intel.Lat == 0 || intel.Lon == 0 {
		return
	}
	if action != "login" && action != "register" {
		return
	}

	key := fmt.Sprintf("threat:geo:%s", userID)
	prev, err := d.redis.Get(ctx, key).Result()
	if err == nil && prev != "" {
		var prevData struct {
			Lat  float64 `json:"lat"`
			Lon  float64 `json:"lon"`
			Time int64   `json:"time"`
			City string  `json:"city"`
		}
		if err := unmarshalJSON(prev, &prevData); err == nil && prevData.Lat != 0 {
			dist := haversine(prevData.Lat, prevData.Lon, intel.Lat, intel.Lon)
			elapsed := time.Since(time.Unix(prevData.Time, 0))

			// If distance > 500km in less than 1 hour — impossible travel
			if dist > 500 && elapsed < 1*time.Hour {
				result.Types = append(result.Types, "impossible_travel")
				result.Alerts = append(result.Alerts, ThreatAlert{
					Type:     "impossible_travel",
					Severity: ThreatHigh,
					Title:    "Impossible Travel Detected",
					Description: fmt.Sprintf("User %s logged in from %s and %s (%.0f km apart) within %s",
						truncID(userID), prevData.City, intel.City, dist, elapsed.Round(time.Minute)),
					Metadata: map[string]any{
						"prevCity": prevData.City, "newCity": intel.City,
						"distanceKm": math.Round(dist), "elapsedMinutes": elapsed.Minutes(),
					},
				})
			}
		}
	}

	// Store current geo
	geoData := fmt.Sprintf(`{"lat":%f,"lon":%f,"time":%d,"city":"%s"}`, intel.Lat, intel.Lon, time.Now().Unix(), intel.City)
	_ = d.redis.Set(ctx, key, geoData, 24*time.Hour).Err()
}

func (d *ThreatDetector) checkOffHours(result *ThreatResult, userID, action string) {
	sensitiveActions := map[string]bool{
		"login": true, "register": true, "failed_login": true,
		"personal_data_delete_request": true, "personal_data_consent_update": true,
	}
	if !sensitiveActions[action] {
		return
	}

	loc, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		return
	}
	now := time.Now().In(loc)
	hour := now.Hour()

	if hour < 6 || hour >= 23 {
		result.Types = append(result.Types, "off_hours")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:     "off_hours",
			Severity: ThreatLow,
			Title:    "Off-Hours Activity",
			Description: fmt.Sprintf("User %s performed %s at %s MSK (outside normal hours 06:00-23:00)",
				truncID(userID), action, now.Format("15:04")),
			Metadata: map[string]any{"localTime": now.Format(time.RFC3339), "action": action},
		})
	}
}

func (d *ThreatDetector) checkNewCountry(ctx context.Context, result *ThreatResult, userID string, intel IPIntel, action string) {
	if userID == "" || d.redis == nil || intel.CountryCode == "" {
		return
	}
	if action != "login" {
		return
	}

	key := fmt.Sprintf("threat:countries:%s", userID)
	added, _ := d.redis.SAdd(ctx, key, intel.CountryCode).Result()
	_ = d.redis.Expire(ctx, key, 30*24*time.Hour).Err()
	count, _ := d.redis.SCard(ctx, key).Result()

	// First ever login from this country (and not the first country ever)
	if added == 1 && count > 1 {
		result.Types = append(result.Types, "new_country")
		result.Alerts = append(result.Alerts, ThreatAlert{
			Type:     "new_country",
			Severity: ThreatMedium,
			Title:    "Login from New Country",
			Description: fmt.Sprintf("User %s logged in from %s (%s) for the first time. Total countries: %d",
				truncID(userID), intel.Country, intel.CountryCode, count),
			Metadata: map[string]any{"country": intel.Country, "countryCode": intel.CountryCode, "totalCountries": count},
		})
	}
}

func (d *ThreatDetector) recordEvent(ctx context.Context, userID, ip string, intel IPIntel) {
	if d.redis == nil || userID == "" {
		return
	}
	// Track successful login IPs for future reference
	key := fmt.Sprintf("threat:history:%s", userID)
	entry := fmt.Sprintf("%s|%s|%s|%d", ip, intel.Country, intel.City, time.Now().Unix())
	_ = d.redis.LPush(ctx, key, entry).Err()
	_ = d.redis.LTrim(ctx, key, 0, 99).Err()
	_ = d.redis.Expire(ctx, key, 90*24*time.Hour).Err()
}

func (d *ThreatDetector) computeLevel(types []string) string {
	if len(types) == 0 {
		return ThreatNone
	}

	severity := map[string]int{
		"tor":               4,
		"brute_force":       3,
		"impossible_travel": 3,
		"proxy":             2,
		"multi_ip":          2,
		"suspicious_ua":     2,
		"new_country":       2,
		"vpn":               1,
		"off_hours":         1,
		"hosting":           1,
	}

	maxScore := 0
	totalScore := 0
	for _, t := range types {
		s := severity[t]
		if s > maxScore {
			maxScore = s
		}
		totalScore += s
	}

	// Multiple low-severity threats compound
	if totalScore >= 6 {
		return ThreatCritical
	}
	if maxScore >= 4 || totalScore >= 4 {
		return ThreatHigh
	}
	if maxScore >= 2 || totalScore >= 3 {
		return ThreatMedium
	}
	return ThreatLow
}

// haversine calculates distance between two coordinates in km.
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

func truncID(id string) string {
	if len(id) > 8 {
		return "..." + id[len(id)-8:]
	}
	return id
}

func unmarshalJSON(data string, v any) error {
	return json.Unmarshal([]byte(data), v)
}
