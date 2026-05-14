package repository

import (
	"context"
	"database/sql"

	"github.com/smartcampus/smartcampus-api/internal/domain"
)

type FloorParams struct {
	BuildingID  string
	Number      int
	Name        string
	MapImageURL string
	Description string
}

func (r *Repository) ListFloors(ctx context.Context, buildingID string) ([]domain.Floor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, building_id::text, number, name, map_image_url, description, created_at, updated_at
		FROM floors WHERE building_id=$1 ORDER BY number`, buildingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []domain.Floor{}
	for rows.Next() {
		item, err := scanFloor(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) GetFloor(ctx context.Context, id string) (domain.Floor, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, building_id::text, number, name, map_image_url, description, created_at, updated_at
		FROM floors WHERE id=$1`, id)
	item, err := scanFloor(row)
	return item, normalizeErr(err)
}

func (r *Repository) CreateFloor(ctx context.Context, p FloorParams) (domain.Floor, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO floors(building_id, number, name, map_image_url, description)
		VALUES($1,$2,$3,$4,$5)
		RETURNING id::text, building_id::text, number, name, map_image_url, description, created_at, updated_at`,
		p.BuildingID, p.Number, stringOrNull(p.Name), stringOrNull(p.MapImageURL), stringOrNull(p.Description))
	return scanFloor(row)
}

type floorScanner interface {
	Scan(dest ...any) error
}

func scanFloor(row floorScanner) (domain.Floor, error) {
	var f domain.Floor
	var name, mapURL, description sql.NullString
	err := row.Scan(&f.ID, &f.BuildingID, &f.Number, &name, &mapURL, &description, &f.CreatedAt, &f.UpdatedAt)
	f.Name = nullableString(name)
	f.MapImageURL = nullableString(mapURL)
	f.Description = nullableString(description)
	return f, err
}
