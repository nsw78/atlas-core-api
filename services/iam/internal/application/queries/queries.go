package queries

type GetUserByIDQuery struct {
	UserID string
}

type GetUserByUsernameQuery struct {
	Username string
}

type ListUsersQuery struct {
	Page     int
	PageSize int
}

type GetUserRolesQuery struct {
	UserID string
}
