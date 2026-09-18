package models

type Meta struct {
	RequestID string `json:"request_id"`
}

type SuccessEnvelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data"`
	Meta    Meta   `json:"meta"`
}

type ErrorEnvelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    string `json:"code"`
	Error   string `json:"error"`
	Meta    Meta   `json:"meta"`
}
