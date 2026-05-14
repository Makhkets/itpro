package repository

import (
	"context"
	"database/sql"
	"strconv"
	"strings"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type RoomParams struct {
	BuildingID      string
	FloorID         string
	Number          string
	Name            string
	Type            string
	Capacity        int
	Description     string
	Equipment       []string
	NavigationHint  string
	NearbyLandmarks string
	IsBookable      bool
	IsActive        bool
	XCoord          *int
	YCoord          *int
}

func (r *Repository) ListRooms(ctx context.Context, filter domain.RoomSearchFilter) ([]domain.Room, error) {
	where := []string{"r.is_active=TRUE"}
	args := []any{}
	if filter.BuildingID != "" {
		where, args = appendWhere(where, args, "r.building_id=$%d", filter.BuildingID)
	}
	if filter.FloorID != "" {
		where, args = appendWhere(where, args, "r.floor_id=$%d", filter.FloorID)
	}
	if filter.Type != "" {
		where, args = appendWhere(where, args, "r.type=$%d", filter.Type)
	}
	limit, offset := paginate(filter.Page, filter.PageSize)
	args = append(args, limit, offset)
	query := `
		SELECT r.id::text, r.building_id::text, r.floor_id::text, r.number, r.name, r.type, r.capacity,
		       r.description, r.equipment::text, r.navigation_hint, r.nearby_landmarks, r.is_bookable,
		       r.is_active, r.x_coord, r.y_coord, r.created_at, r.updated_at
		FROM rooms r WHERE ` + strings.Join(where, " AND ") + `
		ORDER BY r.number LIMIT $` + itoa(len(args)-1) + ` OFFSET $` + itoa(len(args))
	// #nosec G202 -- SQL fragments are static; user values are bound as parameters.
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRooms(rows)
}

func (r *Repository) SearchRooms(ctx context.Context, filter domain.RoomSearchFilter) ([]domain.Room, error) {
	where := []string{"r.is_active=TRUE"}
	args := []any{}
	if filter.Query != "" {
		args = append(args, like(filter.Query))
		idx := len(args)
		where = append(where, "(lower(r.number) LIKE $"+itoa(idx)+" OR lower(coalesce(r.name,'')) LIKE $"+itoa(idx)+" OR lower(b.name) LIKE $"+itoa(idx)+" OR lower(b.code) LIKE $"+itoa(idx)+")")
	}
	if filter.BuildingID != "" {
		where, args = appendWhere(where, args, "r.building_id=$%d", filter.BuildingID)
	}
	if filter.Type != "" {
		where, args = appendWhere(where, args, "r.type=$%d", filter.Type)
	}
	if filter.Equipment != "" {
		where, args = appendWhere(where, args, "r.equipment ? $%d", filter.Equipment)
	}
	if filter.CapacityMin > 0 {
		where, args = appendWhere(where, args, "r.capacity >= $%d", filter.CapacityMin)
	}
	limit, offset := paginate(filter.Page, filter.PageSize)
	args = append(args, limit, offset)
	query := `
		SELECT r.id::text, r.building_id::text, r.floor_id::text, r.number, r.name, r.type, r.capacity,
		       r.description, r.equipment::text, r.navigation_hint, r.nearby_landmarks, r.is_bookable,
		       r.is_active, r.x_coord, r.y_coord, r.created_at, r.updated_at
		FROM rooms r JOIN buildings b ON b.id=r.building_id
		WHERE ` + strings.Join(where, " AND ") + `
		ORDER BY r.number LIMIT $` + itoa(len(args)-1) + ` OFFSET $` + itoa(len(args))
	// #nosec G202 -- SQL fragments are static; user values are bound as parameters.
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRooms(rows)
}

func (r *Repository) GetRoom(ctx context.Context, id string) (domain.Room, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, building_id::text, floor_id::text, number, name, type, capacity,
		       description, equipment::text, navigation_hint, nearby_landmarks, is_bookable,
		       is_active, x_coord, y_coord, created_at, updated_at
		FROM rooms WHERE id=$1`, id)
	item, err := scanRoom(row)
	return item, normalizeErr(err)
}

func (r *Repository) CreateRoom(ctx context.Context, p RoomParams) (domain.Room, error) {
	equipment, err := jsonStrings(p.Equipment)
	if err != nil {
		return domain.Room{}, err
	}
	row := r.pool.QueryRow(ctx, `
		INSERT INTO rooms(building_id, floor_id, number, name, type, capacity, description, equipment,
		                  navigation_hint, nearby_landmarks, is_bookable, is_active, x_coord, y_coord)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14)
		RETURNING id::text, building_id::text, floor_id::text, number, name, type, capacity,
		          description, equipment::text, navigation_hint, nearby_landmarks, is_bookable,
		          is_active, x_coord, y_coord, created_at, updated_at`,
		p.BuildingID, p.FloorID, p.Number, stringOrNull(p.Name), p.Type, p.Capacity,
		stringOrNull(p.Description), string(equipment), stringOrNull(p.NavigationHint), stringOrNull(p.NearbyLandmarks),
		p.IsBookable, p.IsActive, p.XCoord, p.YCoord)
	return scanRoom(row)
}

func (r *Repository) UpdateRoom(ctx context.Context, id string, p RoomParams) (domain.Room, error) {
	equipment, err := jsonStrings(p.Equipment)
	if err != nil {
		return domain.Room{}, err
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE rooms
		SET building_id=$2, floor_id=$3, number=$4, name=$5, type=$6, capacity=$7, description=$8,
		    equipment=$9::jsonb, navigation_hint=$10, nearby_landmarks=$11, is_bookable=$12,
		    is_active=$13, x_coord=$14, y_coord=$15, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, building_id::text, floor_id::text, number, name, type, capacity,
		          description, equipment::text, navigation_hint, nearby_landmarks, is_bookable,
		          is_active, x_coord, y_coord, created_at, updated_at`,
		id, p.BuildingID, p.FloorID, p.Number, stringOrNull(p.Name), p.Type, p.Capacity,
		stringOrNull(p.Description), string(equipment), stringOrNull(p.NavigationHint), stringOrNull(p.NearbyLandmarks),
		p.IsBookable, p.IsActive, p.XCoord, p.YCoord)
	item, err := scanRoom(row)
	return item, normalizeErr(err)
}

func (r *Repository) RoomNavigation(ctx context.Context, roomID string) (domain.RoomNavigation, error) {
	room, err := r.GetRoom(ctx, roomID)
	if err != nil {
		return domain.RoomNavigation{}, err
	}
	building, err := r.GetBuilding(ctx, room.BuildingID)
	if err != nil {
		return domain.RoomNavigation{}, err
	}
	floor, err := r.GetFloor(ctx, room.FloorID)
	if err != nil {
		return domain.RoomNavigation{}, err
	}
	return domain.RoomNavigation{
		Building:        building,
		Floor:           floor,
		Room:            room,
		NavigationHint:  room.NavigationHint,
		NearbyLandmarks: room.NearbyLandmarks,
		MapImageURL:     floor.MapImageURL,
		XCoord:          room.XCoord,
		YCoord:          room.YCoord,
	}, nil
}

type roomScanner interface {
	Scan(dest ...any) error
}

func scanRoom(row roomScanner) (domain.Room, error) {
	var room domain.Room
	var name, description, equipment, navigationHint, nearbyLandmarks sql.NullString
	var x, y sql.NullInt64
	err := row.Scan(&room.ID, &room.BuildingID, &room.FloorID, &room.Number, &name, &room.Type, &room.Capacity,
		&description, &equipment, &navigationHint, &nearbyLandmarks, &room.IsBookable, &room.IsActive,
		&x, &y, &room.CreatedAt, &room.UpdatedAt)
	room.Name = nullableString(name)
	room.Description = nullableString(description)
	room.Equipment = scanJSONString(nullableString(equipment))
	room.NavigationHint = nullableString(navigationHint)
	room.NearbyLandmarks = nullableString(nearbyLandmarks)
	room.XCoord = nullableInt(x)
	room.YCoord = nullableInt(y)
	return room, err
}

type rowsScanner interface {
	Next() bool
	Scan(dest ...any) error
	Err() error
}

func scanRooms(rows rowsScanner) ([]domain.Room, error) {
	out := []domain.Room{}
	for rows.Next() {
		item, err := scanRoom(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func itoa(value int) string {
	return strconv.Itoa(value)
}
