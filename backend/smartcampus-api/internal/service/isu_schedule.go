package service

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

// ISU GSTOU bell schedule. Period 1 = the first pair, period 2 = the second pair, etc.
// Duration is counted in pairs.
var isuPairTimes = []struct {
	start string
	end   string
}{
	{"08:30", "10:00"}, // pair 1 (periods 1-2)
	{"10:10", "11:40"}, // pair 2 (periods 3-4)
	{"11:50", "13:20"}, // pair 3 (periods 5-6)
	{"14:00", "15:30"}, // pair 4 (periods 7-8)
	{"15:40", "17:10"}, // pair 5 (periods 9-10)
	{"17:20", "18:50"}, // pair 6 (periods 11-12)
	{"19:00", "20:30"}, // pair 7 (periods 13-14)
}

func activityTypeLabel(t int) string {
	switch t {
	case 1:
		return "Лекция"
	case 2:
		return "Практика"
	case 3:
		return "Лабораторная"
	default:
		return "Занятие"
	}
}

func teacherName(e ISUEntry) string {
	return teacherForActivity(e, func(t ISUTeacher) string {
		return t.Name
	})
}

func teacherIDFor(e ISUEntry) string {
	return teacherForActivity(e, func(t ISUTeacher) string {
		if t.ID == nil {
			return ""
		}
		return fmt.Sprintf("%d", *t.ID)
	})
}

func teacherForActivity(e ISUEntry, pick func(ISUTeacher) string) string {
	var ordered []ISUTeacher
	switch e.ActivityType {
	case 1:
		ordered = []ISUTeacher{e.Discipline.LectureTeacher, e.Discipline.PracticeTeacher, e.Discipline.LabTeacher}
	case 2:
		ordered = []ISUTeacher{e.Discipline.PracticeTeacher, e.Discipline.LabTeacher, e.Discipline.LectureTeacher}
	case 3:
		ordered = []ISUTeacher{e.Discipline.LabTeacher, e.Discipline.PracticeTeacher, e.Discipline.LectureTeacher}
	default:
		ordered = []ISUTeacher{e.Discipline.LectureTeacher, e.Discipline.PracticeTeacher, e.Discipline.LabTeacher}
	}
	for _, teacher := range ordered {
		if value := pick(teacher); value != "" {
			return value
		}
	}
	return ""
}

func groupNames(e ISUEntry) []string {
	out := make([]string, 0, len(e.Groups))
	for _, g := range e.Groups {
		if g.Name != "" {
			out = append(out, g.Name)
		}
	}
	return out
}

// periodToPair maps a period number (1..7) to a pair index in isuPairTimes.
// Period 1 -> pair 0, period 2 -> pair 1, etc.
func periodToPair(period int) int {
	if period < 1 {
		return 0
	}
	idx := period - 1
	if idx >= len(isuPairTimes) {
		idx = len(isuPairTimes) - 1
	}
	return idx
}

// computeOccurrences expands an ISU entry into concrete date-times within [from, to].
// week: 1 (odd), 2 (even) or nil (every week). week_day: 1=Mon ... 5=Fri.
// Some ISU records are bound to an exact date; for those, date is authoritative.
func computeOccurrences(e ISUEntry, from, to time.Time, loc *time.Location) []time.Time {
	startPair := periodToPair(e.Period)
	startHM := isuPairTimes[startPair].start

	if day, ok := parseISUDate(e.Date, loc); ok {
		start, ok := parseHM(day, startHM, loc)
		if !ok || start.Before(from) || start.After(to) {
			return nil
		}
		return []time.Time{start}
	}

	if e.WeekDay < 1 || e.WeekDay > 7 {
		return nil
	}
	// Iterate days from `from` up to `to`. Cap iteration to a sane range to avoid pathological inputs.
	maxDays := 366
	occurrences := []time.Time{}

	cur := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, loc)
	endDay := time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, loc)

	for i := 0; i <= maxDays && !cur.After(endDay); i++ {
		// Go: Sunday=0, Monday=1 ... Saturday=6. ISU: 1=Mon ... 5=Fri (potentially 6,7).
		wd := int(cur.Weekday())
		if wd == 0 {
			wd = 7
		}
		if wd == e.WeekDay {
			if e.Week == nil || matchesWeekParity(cur, *e.Week) {
				if t, ok := parseHM(cur, startHM, loc); ok {
					if !t.Before(from) && !t.After(to) {
						occurrences = append(occurrences, t)
					}
				}
			}
		}
		cur = cur.AddDate(0, 0, 1)
	}
	return occurrences
}

func matchesWeekParity(day time.Time, week int) bool {
	// ISO week: odd weeks -> week==1, even -> week==2. Adjust if ISU uses different convention.
	_, isoWeek := day.ISOWeek()
	if week == 1 {
		return isoWeek%2 == 1
	}
	if week == 2 {
		return isoWeek%2 == 0
	}
	return true
}

func parseISUDate(raw *string, loc *time.Location) (time.Time, bool) {
	if raw == nil {
		return time.Time{}, false
	}
	value := strings.TrimSpace(*raw)
	if value == "" {
		return time.Time{}, false
	}
	layouts := []string{
		"2006-01-02",
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05",
		"02.01.2006",
	}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, value, loc); err == nil {
			return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc), true
		}
	}
	return time.Time{}, false
}

func parseHM(day time.Time, hm string, loc *time.Location) (time.Time, bool) {
	parts := strings.Split(hm, ":")
	if len(parts) != 2 {
		return time.Time{}, false
	}
	var h, m int
	if _, err := fmt.Sscanf(parts[0], "%d", &h); err != nil {
		return time.Time{}, false
	}
	if _, err := fmt.Sscanf(parts[1], "%d", &m); err != nil {
		return time.Time{}, false
	}
	return time.Date(day.Year(), day.Month(), day.Day(), h, m, 0, 0, loc), true
}

// computeEnd returns the end time for an entry that starts at `start`, given its duration in pairs.
func computeEnd(e ISUEntry, start time.Time) time.Time {
	pairs := e.Duration
	if pairs < 1 {
		pairs = 1
	}
	startPair := periodToPair(e.Period)
	endPairIdx := startPair + pairs - 1
	if endPairIdx >= len(isuPairTimes) {
		endPairIdx = len(isuPairTimes) - 1
	}
	endHM := isuPairTimes[endPairIdx].end
	if t, ok := parseHM(start, endHM, start.Location()); ok {
		return t
	}
	return start.Add(time.Duration(pairs) * 90 * time.Minute)
}

// buildSchedule converts ISU entries into expanded Schedule occurrences for [from, to].
// roomLookup is an optional map: lowercased auditorium name -> room.id.
func buildSchedule(entries []ISUEntry, from, to time.Time, roomLookup map[string]string) []domain.Schedule {
	loc := from.Location()
	out := []domain.Schedule{}
	for _, e := range entries {
		title := fmt.Sprintf("%s (%s)", e.Discipline.Name, activityTypeLabel(e.ActivityType))
		teacher := teacherName(e)
		teacherID := teacherIDFor(e)
		groupList := strings.Join(groupNames(e), ", ")
		audName := strings.TrimSpace(e.Auditorium.Name)
		roomID := ""
		if roomLookup != nil && audName != "" {
			roomID = roomLookup[strings.ToLower(audName)]
		}

		for _, start := range computeOccurrences(e, from, to, loc) {
			end := computeEnd(e, start)
			out = append(out, domain.Schedule{
				ID:          fmt.Sprintf("isu-%d-%s", e.ID, start.Format("20060102")),
				RoomID:      roomID,
				RoomNumber:  audName,
				Title:       title,
				TeacherID:   teacherID,
				TeacherName: teacher,
				GroupName:   groupList,
				StartsAt:    start,
				EndsAt:      end,
				Source:      "isu",
				CreatedAt:   start,
				UpdatedAt:   start,
			})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartsAt.Before(out[j].StartsAt) })
	return out
}

// auditoriumNames collects unique auditorium names from entries.
func auditoriumNames(entries []ISUEntry) []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, e := range entries {
		n := strings.TrimSpace(e.Auditorium.Name)
		if n == "" {
			continue
		}
		key := strings.ToLower(n)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, n)
	}
	return out
}

// ----- Service methods -----

func (s *Service) defaultRange(from, to time.Time) (time.Time, time.Time) {
	if from.IsZero() && to.IsZero() {
		now := time.Now()
		from = now.Add(-1 * time.Hour)
		to = now.AddDate(0, 0, 14)
	} else if from.IsZero() {
		from = to.AddDate(0, 0, -14)
	} else if to.IsZero() {
		to = from.AddDate(0, 0, 14)
	}
	return from, to
}

func (s *Service) resolveRoomLookup(ctx context.Context, entries []ISUEntry) map[string]string {
	names := auditoriumNames(entries)
	if len(names) == 0 {
		return map[string]string{}
	}
	lookup, err := s.repo.LookupRoomIDsByNames(ctx, names)
	if err != nil {
		s.log.Error("isu: room lookup failed", "err", err)
		return map[string]string{}
	}
	return lookup
}

// GroupScheduleISU returns expanded schedule entries for a group from ISU.
func (s *Service) GroupScheduleISU(ctx context.Context, groupName string, from, to time.Time) ([]domain.Schedule, error) {
	from, to = s.defaultRange(from, to)
	entries, err := s.isu.ByGroup(ctx, groupName)
	if err != nil {
		return s.localGroupSchedule(ctx, groupName, from, to, err)
	}
	return buildSchedule(entries, from, to, s.resolveRoomLookup(ctx, entries)), nil
}

// TeacherScheduleISU returns expanded schedule entries for a teacher (by name) from ISU.
func (s *Service) TeacherScheduleISU(ctx context.Context, teacherName string, from, to time.Time) ([]domain.Schedule, error) {
	from, to = s.defaultRange(from, to)
	entries, err := s.isu.ByTeacher(ctx, teacherName)
	if err != nil {
		return nil, err
	}
	return buildSchedule(entries, from, to, s.resolveRoomLookup(ctx, entries)), nil
}

// RoomScheduleISU fetches the ISU schedule and filters it down to entries that map to the given room.
// ISU has no per-room endpoint, so we look up the room name and filter group entries that reference it.
// Strategy: load room name, then fetch ISU once per institute? Without an institute hint we'd have to
// query every group — too expensive. Instead this endpoint returns an empty slice unless callers pass a
// groupName filter via the existing query string. We expose RoomScheduleISU mainly to keep the contract.
func (s *Service) RoomScheduleISU(ctx context.Context, roomID, groupHint string, from, to time.Time) ([]domain.Schedule, error) {
	from, to = s.defaultRange(from, to)
	if strings.TrimSpace(groupHint) == "" {
		return []domain.Schedule{}, nil
	}
	room, err := s.repo.GetRoom(ctx, roomID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	entries, err := s.isu.ByGroup(ctx, groupHint)
	if err != nil {
		return nil, err
	}
	target := strings.ToLower(strings.TrimSpace(room.Number))
	targetName := strings.ToLower(strings.TrimSpace(room.Name))
	filtered := entries[:0]
	for _, e := range entries {
		n := strings.ToLower(strings.TrimSpace(e.Auditorium.Name))
		if n == "" {
			continue
		}
		if n == target || (targetName != "" && n == targetName) {
			filtered = append(filtered, e)
		}
	}
	return buildSchedule(filtered, from, to, map[string]string{strings.ToLower(room.Number): room.ID}), nil
}

// CurrentScheduleISU returns the current and next lesson for a group from ISU.
func (s *Service) CurrentScheduleISU(ctx context.Context, groupName string, now time.Time) (domain.ScheduleCurrent, error) {
	if strings.TrimSpace(groupName) == "" {
		return domain.ScheduleCurrent{Now: now}, nil
	}
	from := now.AddDate(0, 0, -1)
	to := now.AddDate(0, 0, 14)
	entries, err := s.isu.ByGroup(ctx, groupName)
	if err != nil {
		items, fallbackErr := s.localGroupSchedule(ctx, groupName, from, to, err)
		if fallbackErr != nil {
			return domain.ScheduleCurrent{}, fallbackErr
		}
		return currentFromItems(now, items), nil
	}
	expanded := buildSchedule(entries, from, to, s.resolveRoomLookup(ctx, entries))
	return currentFromItems(now, expanded), nil
}

func (s *Service) localGroupSchedule(ctx context.Context, groupName string, from, to time.Time, cause error) ([]domain.Schedule, error) {
	if s.log != nil {
		s.log.Error("isu: group schedule failed, using local fallback", "group", groupName, "err", cause)
	}
	if s.repo == nil {
		return nil, cause
	}
	items, err := s.repo.ListGroupSchedule(ctx, groupName, from, to)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	if len(items) == 0 {
		return nil, cause
	}
	return items, nil
}

func currentFromItems(now time.Time, expanded []domain.Schedule) domain.ScheduleCurrent {
	var current, next *domain.Schedule
	for i := range expanded {
		item := expanded[i]
		if !item.StartsAt.After(now) && item.EndsAt.After(now) {
			c := item
			current = &c
		} else if item.StartsAt.After(now) {
			n := item
			next = &n
			break
		}
	}
	return domain.ScheduleCurrent{Now: now, CurrentLesson: current, NextLesson: next}
}
