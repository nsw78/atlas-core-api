package types

import (
	"fmt"
	"net/http"
)

// ErrorCode represents a specific error code in the system
type ErrorCode int

const (
	// HTTP Errors
	ErrBadRequest ErrorCode = iota + 1
	ErrUnauthorized
	ErrForbidden
	ErrNotFound
	ErrConflict
	ErrUnprocessableEntity
	ErrTooManyRequests
	ErrInternalServerError
	ErrServiceUnavailable
	ErrGatewayTimeout

	// Auth Errors
	ErrInvalidCredentials
	ErrTokenExpired
	ErrTokenInvalid
	ErrMFARequired
	ErrSessionExpired

	// Validation Errors
	ErrValidationFailed
	ErrMissingField
	ErrInvalidField
	ErrInvalidEmail
	ErrInvalidPhoneNumber

	// Business Logic Errors
	ErrUserNotFound
	ErrUserAlreadyExists
	ErrPermissionDenied
	ErrResourceNotFound
	ErrOperationFailed

	// System Errors
	ErrCircuitBreakerOpen
	ErrServiceTimeout
	ErrDatabaseError
	ErrCacheError
)

// APIError represents an API error response
type APIError struct {
	Code      ErrorCode
	Message   string
	Details   map[string]interface{}
	StatusCode int
	TraceID   string
}

// Error implements the error interface
func (e *APIError) Error() string {
	return e.Message
}

// NewAPIError creates a new API error
func NewAPIError(code ErrorCode, message string) *APIError {
	return &APIError{
		Code:       code,
		Message:    message,
		Details:    make(map[string]interface{}),
		StatusCode: codeToStatusCode(code),
	}
}

// NewAPIErrorWithDetails creates a new API error with details
func NewAPIErrorWithDetails(code ErrorCode, message string, details map[string]interface{}) *APIError {
	return &APIError{
		Code:       code,
		Message:    message,
		Details:    details,
		StatusCode: codeToStatusCode(code),
	}
}

// WithTraceID adds a trace ID to the error
func (e *APIError) WithTraceID(traceID string) *APIError {
	e.TraceID = traceID
	return e
}

// WithDetails adds details to the error
func (e *APIError) WithDetails(key string, value interface{}) *APIError {
	e.Details[key] = value
	return e
}

// codeToStatusCode maps ErrorCode to HTTP status codes
func codeToStatusCode(code ErrorCode) int {
	switch code {
	case ErrBadRequest, ErrValidationFailed, ErrMissingField, ErrInvalidField, ErrInvalidEmail, ErrInvalidPhoneNumber:
		return http.StatusBadRequest
	case ErrUnauthorized, ErrInvalidCredentials, ErrTokenExpired, ErrTokenInvalid, ErrSessionExpired:
		return http.StatusUnauthorized
	case ErrForbidden, ErrPermissionDenied, ErrMFARequired:
		return http.StatusForbidden
	case ErrNotFound, ErrUserNotFound, ErrResourceNotFound:
		return http.StatusNotFound
	case ErrConflict, ErrUserAlreadyExists:
		return http.StatusConflict
	case ErrUnprocessableEntity:
		return http.StatusUnprocessableEntity
	case ErrTooManyRequests:
		return http.StatusTooManyRequests
	case ErrServiceUnavailable, ErrCircuitBreakerOpen:
		return http.StatusServiceUnavailable
	case ErrGatewayTimeout, ErrServiceTimeout:
		return http.StatusGatewayTimeout
	case ErrInternalServerError, ErrOperationFailed, ErrDatabaseError, ErrCacheError:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

// ValidationError represents validation errors
type ValidationError struct {
	Field   string
	Message string
}

// ValidationErrors represents multiple validation errors
type ValidationErrors struct {
	Errors []ValidationError
}

// Error implements the error interface
func (ve *ValidationErrors) Error() string {
	return fmt.Sprintf("validation failed: %d errors", len(ve.Errors))
}

// ToAPIError converts ValidationErrors to APIError
func (ve *ValidationErrors) ToAPIError() *APIError {
	details := make(map[string]interface{})
	for i, err := range ve.Errors {
		details[fmt.Sprintf("error_%d", i)] = map[string]string{
			"field":   err.Field,
			"message": err.Message,
		}
	}
	return NewAPIErrorWithDetails(ErrValidationFailed, "Validation failed", details)
}

// Add adds a validation error
func (ve *ValidationErrors) Add(field, message string) {
	ve.Errors = append(ve.Errors, ValidationError{
		Field:   field,
		Message: message,
	})
}

// HasErrors checks if there are any validation errors
func (ve *ValidationErrors) HasErrors() bool {
	return len(ve.Errors) > 0
}

// ErrorResponse represents an error response sent to the client
type ErrorResponse struct {
	Code    int                   `json:"code"`
	Message string                `json:"message"`
	TraceID string                `json:"trace_id,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
	Path    string                `json:"path,omitempty"`
	Status  int                   `json:"status"`
}

// NewErrorResponse creates a new error response
func NewErrorResponse(err *APIError, path string) *ErrorResponse {
	return &ErrorResponse{
		Code:    int(err.Code),
		Message: err.Message,
		TraceID: err.TraceID,
		Details: err.Details,
		Path:    path,
		Status:  err.StatusCode,
	}
}
