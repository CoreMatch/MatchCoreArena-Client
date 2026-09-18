package models

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type TOTPRequiredResponse struct {
	TOTPRequired bool   `json:"totp_required"`
	LoginTicket  string `json:"login_ticket"`
	ExpiresIn    int    `json:"expires_in"`
}

type TOTPRequest struct {
	LoginTicket string `json:"login_ticket"`
	Passcode    string `json:"passcode"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}
