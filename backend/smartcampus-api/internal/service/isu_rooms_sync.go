package service

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/smartcampus/smartcampus-api/internal/domain"
	"github.com/smartcampus/smartcampus-api/internal/repository"
)

// ISURoomSyncResult contains the results of an ISU rooms sync operation.
type ISURoomSyncResult struct {
	BuildingsCreated int      `json:"buildingsCreated"`
	FloorsCreated    int      `json:"floorsCreated"`
	RoomsCreated     int      `json:"roomsCreated"`
	RoomsSkipped     int      `json:"roomsSkipped"`
	GroupsFetched    int      `json:"groupsFetched"`
	Errors           []string `json:"errors,omitempty"`
}

// parsedAud represents a parsed auditorium name: building code, floor number, room number.
type parsedAud struct {
	isuID      int64
	raw        string
	building   string
	floor      int
	number     string
	capacity   int
	variant    string
}

// Real ISU auditorium name formats:
// "ауд. ГУК 1-14"  → building=ГУК, floor=1, room=14
// "ауд. ГУК 4-49"  → building=ГУК, floor=4, room=49
// "ауд. НК 2-05"   → building=НК, floor=2, room=05
// "спортзал"        → building=Другое, floor=1
// "А-305"           → building=А, floor=3
var (
	// "ауд. ГУК 1-14" or "ГУК 1-14"
	audPatternFull = regexp.MustCompile(`(?i)^(?:ауд\.?\s*)?([А-Яа-яA-Za-z]+(?:\s+[А-Яа-яA-Za-z]+)?)\s+(\d+)[-–](\d+)$`)
	// "А-305" style
	audPatternShort = regexp.MustCompile(`^([А-Яа-яA-Za-z]+)\s*[-–]\s*(\d+)$`)
)

func parseAuditoriumName(name string, isuID int64, capacity int, variant string) parsedAud {
	name = strings.TrimSpace(name)
	// Strip leading "ауд." for display number
	display := name
	display = strings.TrimPrefix(display, "ауд. ")
	display = strings.TrimPrefix(display, "ауд.")
	display = strings.TrimSpace(display)

	p := parsedAud{
		isuID:    isuID,
		raw:      name,
		number:   display,
		capacity: capacity,
		variant:  variant,
		building: "Другое",
		floor:    1,
	}

	// Try full pattern: "ауд. ГУК 1-14" → building=ГУК, floor=1
	if m := audPatternFull.FindStringSubmatch(name); len(m) >= 4 {
		p.building = strings.ToUpper(strings.TrimSpace(m[1]))
		if fl, err := strconv.Atoi(m[2]); err == nil && fl > 0 && fl <= 20 {
			p.floor = fl
		}
		return p
	}

	// Try short pattern: "А-305" → building=А, floor=3
	if m := audPatternShort.FindStringSubmatch(display); len(m) >= 3 {
		p.building = strings.ToUpper(m[1])
		roomNum := m[2]
		if len(roomNum) >= 1 {
			if fl, err := strconv.Atoi(string(roomNum[0])); err == nil && fl > 0 && fl <= 9 {
				p.floor = fl
			}
		}
		return p
	}

	return p
}

func roomTypeFromVariant(variant string) string {
	v := strings.ToLower(variant)
	switch {
	case strings.Contains(v, "лекц"):
		return "lecture"
	case strings.Contains(v, "компьютер") || strings.Contains(v, "комп"):
		return "computer_lab"
	case strings.Contains(v, "лабор"):
		return "lab"
	case strings.Contains(v, "библ"):
		return "library"
	default:
		return "lecture"
	}
}

// SyncRoomsFromISU fetches timetable entries for given groups, extracts unique auditoriums,
// and creates corresponding buildings, floors, and rooms in the database.
// Groups are provided by the user — each call adds only NEW rooms that don't exist yet.
func (s *Service) SyncRoomsFromISU(ctx context.Context, groups []string) (ISURoomSyncResult, error) {
	result := ISURoomSyncResult{}

	if len(groups) == 0 {
		return result, fmt.Errorf("укажите хотя бы одну группу")
	}

	// Step 1: Fetch timetable entries for all groups and collect unique auditoriums
	type audKey struct {
		id   int64
		name string
	}
	auds := map[audKey]ISUAud{}
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Limit concurrency
	sem := make(chan struct{}, 5)
	for _, g := range groups {
		wg.Add(1)
		go func(groupName string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			entries, err := s.isu.ByGroup(ctx, groupName)
			if err != nil {
				mu.Lock()
				result.Errors = append(result.Errors, fmt.Sprintf("group %s: %v", groupName, err))
				mu.Unlock()
				return
			}
			mu.Lock()
			result.GroupsFetched++
			for _, e := range entries {
				if strings.TrimSpace(e.Auditorium.Name) != "" {
					key := audKey{id: e.Auditorium.ID, name: e.Auditorium.Name}
					if _, exists := auds[key]; !exists {
						auds[key] = e.Auditorium
					}
				}
			}
			mu.Unlock()
		}(g)
	}
	wg.Wait()

	if len(auds) == 0 {
		return result, nil
	}

	// Step 2: Parse auditorium names and group by building
	type buildingGroup struct {
		code  string
		rooms []parsedAud
	}
	buildingMap := map[string]*buildingGroup{}
	for _, aud := range auds {
		cap := 0
		if aud.Capacity != nil {
			cap = *aud.Capacity
		}
		p := parseAuditoriumName(aud.Name, aud.ID, cap, aud.Variant)
		bg, ok := buildingMap[p.building]
		if !ok {
			bg = &buildingGroup{code: p.building}
			buildingMap[p.building] = bg
		}
		bg.rooms = append(bg.rooms, p)
	}

	// Step 3: Get existing buildings and rooms to avoid duplicates
	existingBuildings, _ := s.repo.ListBuildings(ctx)
	buildingCodeToID := map[string]string{}
	for _, b := range existingBuildings {
		buildingCodeToID[strings.ToUpper(b.Code)] = b.ID
	}

	existingRooms, _ := s.repo.ListRooms(ctx, domain.RoomSearchFilter{PageSize: 9999})
	existingRoomNumbers := map[string]bool{}
	for _, r := range existingRooms {
		existingRoomNumbers[strings.ToLower(r.Number)] = true
	}

	// Step 4: Create buildings, floors, rooms
	for _, bg := range buildingMap {
		buildingID, ok := buildingCodeToID[bg.code]
		if !ok {
			// Create building
			building, err := s.repo.CreateBuilding(ctx, repository.BuildingParams{
				Name:           fmt.Sprintf("Корпус %s", bg.code),
				Code:           bg.code,
				NavigationMode: "text",
				IsActive:       true,
			})
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("create building %s: %v", bg.code, err))
				continue
			}
			buildingID = building.ID
			buildingCodeToID[bg.code] = buildingID
			result.BuildingsCreated++
		}

		// Collect unique floors for this building
		floorNumbers := map[int]bool{}
		for _, r := range bg.rooms {
			floorNumbers[r.floor] = true
		}

		// Get existing floors for this building
		existingFloors, _ := s.repo.ListFloors(ctx, buildingID)
		floorNumToID := map[int]string{}
		for _, f := range existingFloors {
			floorNumToID[f.Number] = f.ID
		}

		// Create missing floors
		for fn := range floorNumbers {
			if _, exists := floorNumToID[fn]; !exists {
				floor, err := s.repo.CreateFloor(ctx, repository.FloorParams{
					BuildingID: buildingID,
					Number:     fn,
					Name:       fmt.Sprintf("Этаж %d", fn),
				})
				if err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("create floor %d in %s: %v", fn, bg.code, err))
					continue
				}
				floorNumToID[fn] = floor.ID
				result.FloorsCreated++
			}
		}

		// Create rooms
		for _, r := range bg.rooms {
			if existingRoomNumbers[strings.ToLower(r.number)] {
				result.RoomsSkipped++
				continue
			}

			floorID, ok := floorNumToID[r.floor]
			if !ok {
				result.Errors = append(result.Errors, fmt.Sprintf("no floor for room %s", r.number))
				continue
			}

			cap := r.capacity
			if cap == 0 {
				cap = 30 // default
			}

			_, err := s.repo.CreateRoom(ctx, repository.RoomParams{
				BuildingID: buildingID,
				FloorID:    floorID,
				Number:     r.number,
				Name:       r.raw,
				Type:       roomTypeFromVariant(r.variant),
				Capacity:   cap,
				IsBookable: true,
				IsActive:   true,
			})
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("create room %s: %v", r.number, err))
				continue
			}
			existingRoomNumbers[strings.ToLower(r.number)] = true
			result.RoomsCreated++
		}
	}

	s.log.Info("isu_rooms_sync_done",
		"buildings_created", result.BuildingsCreated,
		"floors_created", result.FloorsCreated,
		"rooms_created", result.RoomsCreated,
		"rooms_skipped", result.RoomsSkipped,
		"groups_fetched", result.GroupsFetched,
		"errors", len(result.Errors),
	)

	return result, nil
}

