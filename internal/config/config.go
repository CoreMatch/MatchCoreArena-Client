package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	ServerURL string `json:"server_url"`
	Debug     bool   `json:"debug"`
	// GameServerHost/GameServerPort 是玩家实际进入对战的游戏服务器地址，
	// 用于匹配成功后的本地交接（INTEROP-SPEC v1）与“手动加入”展示。
	// 对战服务端本身不下发该地址，故由玩家在此配置。
	GameServerHost string `json:"game_server_host,omitempty"`
	GameServerPort int    `json:"game_server_port,omitempty"`
}

func LoadConfig() (*Config, error) {
	configPath := getConfigPath()

	// Default config
	config := &Config{
		ServerURL: "https://arena.mcnb.dev/",
		Debug:     false,
	}

	// Try to load config file
	if _, err := os.Stat(configPath); err == nil {
		data, err := os.ReadFile(configPath)
		if err != nil {
			return nil, err
		}

		if err := json.Unmarshal(data, config); err != nil {
			return nil, err
		}
	}

	// Environment variable override (env-over-file precedence).
	if envURL := os.Getenv("MCA_SERVER_URL"); envURL != "" {
		config.ServerURL = envURL
	}

	return config, nil
}

func SaveConfig(config *Config) error {
	configPath := getConfigPath()

	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}

func getConfigPath() string {
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, ".matchcorearena", "config.json")
}
