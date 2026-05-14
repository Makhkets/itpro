package repository

import (
	"context"
	"database/sql"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type RouteParams struct {
	FromBuildingID     string
	ToBuildingID       string
	Title              string
	Description        string
	EstimatedMinutes   int
	DistanceMeters     *int
	RouteType          string
	AccessibilityNotes string
}

func (r *Repository) GetRoutes(ctx context.Context, fromBuildingID, toBuildingID string) ([]domain.CampusRoute, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, from_building_id::text, to_building_id::text, title, description,
		       estimated_minutes, distance_meters, route_type, accessibility_notes, created_at, updated_at
		FROM campus_routes
		WHERE ($1='' OR from_building_id=$1) AND ($2='' OR to_building_id=$2)
		ORDER BY title`, fromBuildingID, toBuildingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []domain.CampusRoute{}
	for rows.Next() {
		item, err := scanRoute(rows)
		if err != nil {
			return nil, err
		}
		if b, err := r.GetBuilding(ctx, item.FromBuildingID); err == nil {
			item.FromBuilding = &b
		}
		if b, err := r.GetBuilding(ctx, item.ToBuildingID); err == nil {
			item.ToBuilding = &b
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) CreateRoute(ctx context.Context, p RouteParams) (domain.CampusRoute, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO campus_routes(from_building_id, to_building_id, title, description, estimated_minutes, distance_meters, route_type, accessibility_notes)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id::text, from_building_id::text, to_building_id::text, title, description,
		          estimated_minutes, distance_meters, route_type, accessibility_notes, created_at, updated_at`,
		p.FromBuildingID, p.ToBuildingID, stringOrNull(p.Title), p.Description, p.EstimatedMinutes,
		p.DistanceMeters, p.RouteType, stringOrNull(p.AccessibilityNotes))
	return scanRoute(row)
}

func (r *Repository) UpdateRoute(ctx context.Context, id string, p RouteParams) (domain.CampusRoute, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE campus_routes
		SET from_building_id=$2, to_building_id=$3, title=$4, description=$5, estimated_minutes=$6,
		    distance_meters=$7, route_type=$8, accessibility_notes=$9, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, from_building_id::text, to_building_id::text, title, description,
		          estimated_minutes, distance_meters, route_type, accessibility_notes, created_at, updated_at`,
		id, p.FromBuildingID, p.ToBuildingID, stringOrNull(p.Title), p.Description, p.EstimatedMinutes,
		p.DistanceMeters, p.RouteType, stringOrNull(p.AccessibilityNotes))
	item, err := scanRoute(row)
	return item, normalizeErr(err)
}

type routeScanner interface {
	Scan(dest ...any) error
}

func scanRoute(row routeScanner) (domain.CampusRoute, error) {
	var route domain.CampusRoute
	var title, accessibility sql.NullString
	var distance sql.NullInt64
	err := row.Scan(&route.ID, &route.FromBuildingID, &route.ToBuildingID, &title, &route.Description,
		&route.EstimatedMinutes, &distance, &route.RouteType, &accessibility, &route.CreatedAt, &route.UpdatedAt)
	route.Title = nullableString(title)
	route.DistanceMeters = nullableInt(distance)
	route.AccessibilityNotes = nullableString(accessibility)
	return route, err
}
