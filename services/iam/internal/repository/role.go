package repository

type Role struct {
	ID          string
	Name        string
	Permissions []string
}

type RoleRepository interface {
	GetByID(id string) (*Role, error)
	GetByName(name string) (*Role, error)
	List() ([]*Role, error)
	Create(role *Role) error
}

type roleRepository struct {
	// TODO: Add database connection
}

func NewRoleRepository(/* db *sql.DB */) RoleRepository {
	return &roleRepository{}
}

func (r *roleRepository) GetByID(id string) (*Role, error) {
	// TODO: Implement
	return nil, nil
}

func (r *roleRepository) GetByName(name string) (*Role, error) {
	// TODO: Implement
	return nil, nil
}

func (r *roleRepository) List() ([]*Role, error) {
	// TODO: Implement
	return []*Role{}, nil
}

func (r *roleRepository) Create(role *Role) error {
	// TODO: Implement
	return nil
}
