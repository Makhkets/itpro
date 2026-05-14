package repository

import (
	"context"
	"database/sql"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type BuildingParams struct {
	Name           string
	Code           string
	Address        string
	Description    string
	Latitude       *float64
	Longitude      *float64
	IsOldBuilding  bool
	NavigationMode string
	IsActive       bool
}

func (r *Repository) ListBuildings(ctx context.Context) ([]domain.Building, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, name, code, address, description, latitude::float8, longitude::float8,
		       is_old_building, navigation_mode, is_active, created_at, updated_at
		FROM buildings WHERE is_active=TRUE ORDER BY code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []domain.Building{}
	for rows.Next() {
		item, err := scanBuilding(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) GetBuilding(ctx context.Context, id string) (domain.Building, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, name, code, address, description, latitude::float8, longitude::float8,
		       is_old_building, navigation_mode, is_active, created_at, updated_at
		FROM buildings WHERE id=$1`, id)
	item, err := scanBuilding(row)
	return item, normalizeErr(err)
}

func (r *Repository) CreateBuilding(ctx context.Context, p BuildingParams) (domain.Building, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO buildings(name, code, address, description, latitude, longitude, is_old_building, navigation_mode, is_active)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id::text, name, code, address, description, latitude::float8, longitude::float8,
		          is_old_building, navigation_mode, is_active, created_at, updated_at`,
		p.Name, p.Code, stringOrNull(p.Address), stringOrNull(p.Description), p.Latitude, p.Longitude,
		p.IsOldBuilding, p.NavigationMode, p.IsActive)
	return scanBuilding(row)
}

func (r *Repository) UpdateBuilding(ctx context.Context, id string, p BuildingParams) (domain.Building, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE buildings
		SET name=$2, code=$3, address=$4, description=$5, latitude=$6, longitude=$7,
		    is_old_building=$8, navigation_mode=$9, is_active=$10, updated_at=NOW()
		WHERE id=$1
		RETURNING id::text, name, code, address, description, latitude::float8, longitude::float8,
		          is_old_building, navigation_mode, is_active, created_at, updated_at`,
		id, p.Name, p.Code, stringOrNull(p.Address), stringOrNull(p.Description), p.Latitude, p.Longitude,
		p.IsOldBuilding, p.NavigationMode, p.IsActive)
	item, err := scanBuilding(row)
	return item, normalizeErr(err)
}

type buildingScanner interface {
	Scan(dest ...any) error
}

func scanBuilding(row buildingScanner) (domain.Building, error) {
	var b domain.Building
	var address, description sql.NullString
	var lat, lon sql.NullFloat64
	err := row.Scan(&b.ID, &b.Name, &b.Code, &address, &description, &lat, &lon,
		&b.IsOldBuilding, &b.NavigationMode, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	b.Address = nullableString(address)
	b.Description = nullableString(description)
	b.Latitude = nullableFloat(lat)
	b.Longitude = nullableFloat(lon)
	return b, err
}
