package config

import (
	"os"
	"path/filepath"
	"testing"
)

// TestServerURLPrecedence pins the documented precedence for server_url:
// explicit config file > MCA_SERVER_URL env var > built-in default.
func TestServerURLPrecedence(t *testing.T) {
	setEnv := func(t *testing.T, value string) {
		t.Helper()
		orig := os.Getenv("MCA_SERVER_URL")
		if value == "" {
			if err := os.Unsetenv("MCA_SERVER_URL"); err != nil {
				t.Fatal(err)
			}
		} else if err := os.Setenv("MCA_SERVER_URL", value); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = os.Setenv("MCA_SERVER_URL", orig) })
	}

	setHome := func(t *testing.T, home string) {
		t.Helper()
		orig := os.Getenv("HOME")
		if err := os.Setenv("HOME", home); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = os.Setenv("HOME", orig) })
	}

	writeConfig := func(t *testing.T, home, content string) {
		t.Helper()
		cfgDir := filepath.Join(home, ".matchcorearena")
		if err := os.MkdirAll(cfgDir, 0755); err != nil {
			t.Fatalf("mkdir: %v", err)
		}
		if err := os.WriteFile(filepath.Join(cfgDir, "config.json"), []byte(content), 0644); err != nil {
			t.Fatalf("write config: %v", err)
		}
	}

	t.Run("explicit file value beats env", func(t *testing.T) {
		setEnv(t, "https://env.example.com/")
		home := t.TempDir()
		writeConfig(t, home, `{"server_url": "https://file.example.com/"}`)
		setHome(t, home)

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://file.example.com/" {
			t.Errorf("expected file value to win, got %q", cfg.ServerURL)
		}
	})

	t.Run("env used when file omits server_url", func(t *testing.T) {
		setEnv(t, "https://env.example.com/")
		home := t.TempDir()
		writeConfig(t, home, `{"debug": true}`)
		setHome(t, home)

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://env.example.com/" {
			t.Errorf("expected env value, got %q", cfg.ServerURL)
		}
		if !cfg.Debug {
			t.Errorf("expected debug from file, got false")
		}
	})

	t.Run("env used when file sets empty server_url", func(t *testing.T) {
		setEnv(t, "https://env.example.com/")
		home := t.TempDir()
		writeConfig(t, home, `{"server_url": ""}`)
		setHome(t, home)

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://env.example.com/" {
			t.Errorf("expected env value for empty file server_url, got %q", cfg.ServerURL)
		}
	})

	t.Run("no env: file value used", func(t *testing.T) {
		setEnv(t, "")
		home := t.TempDir()
		writeConfig(t, home, `{"server_url": "https://file.example.com/"}`)
		setHome(t, home)

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://file.example.com/" {
			t.Errorf("expected file value, got %q", cfg.ServerURL)
		}
	})

	t.Run("neither env nor file: default used", func(t *testing.T) {
		setEnv(t, "")
		setHome(t, filepath.Join(t.TempDir(), "nope"))

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://arena.mcnb.dev/" {
			t.Errorf("expected default, got %q", cfg.ServerURL)
		}
	})

	t.Run("game server fields come from file", func(t *testing.T) {
		setEnv(t, "")
		home := t.TempDir()
		writeConfig(t, home, `{"server_url": "https://file.example.com/", "game_server_host": "play.example.com", "game_server_port": 5123}`)
		setHome(t, home)

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.GameServerHost != "play.example.com" || cfg.GameServerPort != 5123 {
			t.Errorf("expected game server fields from file, got %q/%d", cfg.GameServerHost, cfg.GameServerPort)
		}
	})
}
