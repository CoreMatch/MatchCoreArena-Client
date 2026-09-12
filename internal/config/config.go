package config
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	ServerURL string `json:"server_url"`
	Debug     bool   `json:"debug"`
}

func LoadConfig() (*Config, error) {
	configPath := getConfigPath()
	
	// Default config
	config := &Config{
		ServerURL: "http://localhost:8080",
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