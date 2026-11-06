package config

import (
	"os"
	"path/filepath"
	"testing"
)

// TestMCAEnvOverridesFile verifies that MCA_SERVER_URL takes precedence
// over the value in config.json (env-over-file precedence).
func TestMCAEnvOverridesFile(t *testing.T) {
	// Prepare a temp home with a config.json that sets server_url.
	tmpHome := t.TempDir()
	cfgDir := filepath.Join(tmpHome, ".matchcorearena")
	if err := os.MkdirAll(cfgDir, 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	cfgPath := filepath.Join(cfgDir, "config.json")
	if err := os.WriteFile(cfgPath, []byte(`{"server_url": "https://file.example.com/"}`), 0644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	// Point getConfigPath at our temp dir by re-binding os.UserHomeDir
	// is not directly injectable here, so we temporarily unset MCA_SERVER_URL
	// and verify via the file path we control indirectly. Instead, we test
	// env override by setting MCA_SERVER_URL and checking it wins.

	// Capture original env, then set env override.
	origEnv := os.Getenv("MCA_SERVER_URL")
	t.Cleanup(func() { _ = os.Setenv("MCA_SERVER_URL", origEnv) })

	t.Run("env variable takes precedence over file", func(t *testing.T) {
		if err := os.Setenv("MCA_SERVER_URL", "https://env.example.com/"); err != nil {
			t.Fatal(err)
		}

		// Directly test the env-override logic by calling LoadConfig and
		// verifying that when env AND file both exist, env wins.
		// We cannot control getConfigPath's home resolution, so we patch it
		// via os.Setenv("HOME", ...).
		origHome := os.Getenv("HOME")
		if err := os.Setenv("HOME", tmpHome); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = os.Setenv("HOME", origHome) })

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://env.example.com/" {
			t.Errorf("expected env override to win, got %q (file had https://file.example.com/)", cfg.ServerURL)
		}
	})

	t.Run("no env: file value used", func(t *testing.T) {
		if err := os.Unsetenv("MCA_SERVER_URL"); err != nil {
			t.Fatal(err)
		}
		origHome := os.Getenv("HOME")
		if err := os.Setenv("HOME", tmpHome); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = os.Setenv("HOME", origHome) })

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://file.example.com/" {
			t.Errorf("expected file value, got %q", cfg.ServerURL)
		}
	})

	t.Run("neither env nor file: default used", func(t *testing.T) {
		if err := os.Unsetenv("MCA_SERVER_URL"); err != nil {
			t.Fatal(err)
		}
		// Point HOME at a non-existent dir so no config.json is found.
		emptyHome := filepath.Join(t.TempDir(), "nope")
		origHome := os.Getenv("HOME")
		if err := os.Setenv("HOME", emptyHome); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = os.Setenv("HOME", origHome) })

		cfg, err := LoadConfig()
		if err != nil {
			t.Fatalf("LoadConfig: %v", err)
		}
		if cfg.ServerURL != "https://arena.mcnb.dev/" {
			t.Errorf("expected default, got %q", cfg.ServerURL)
		}
	})
}
