package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// ConfigManager 管理 NexusLink 配置
type ConfigManager struct {
	mu         sync.RWMutex
	config     *NexusConfig
	storage    *Storage
	apiBase    string
	httpClient *http.Client
}

// Proxy 代理配置
type Proxy struct {
	Name        string `json:"name"`
	Type        string `json:"type"` // tcp, udp, http, https
	LocalPort   int    `json:"local_port"`
	RemotePort  int    `json:"remote_port,omitempty"`
	LocalAddr   string `json:"local_addr,omitempty"`
	CustomDomains []string `json:"custom_domains,omitempty"`
	Subdomain   string `json:"subdomain,omitempty"`
	Routes      string `json:"routes,omitempty"`
}

// NexusConfig NexusLink 主配置
type NexusConfig struct {
	ServerAddr   string  `json:"server_addr"`
	ServerPort   int     `json:"server_port"`
	AuthType     string  `json:"auth_type,omitempty"`
	AuthToken    string  `json:"auth_token,omitempty"`
	ProxyProtocols string `json:"proxy_protocols,omitempty"`
	Proxies      []Proxy `json:"proxies"`
	// TLS 配置
	TLSEnable     bool     `json:"tls_enable,omitempty"`
	TLSTlsVerify  bool     `json:"tls_verify,omitempty"`
	// 性能配置
	ConnectRetry int      `json:"connect_retry,omitempty"`
	EnableCompression bool `json:"enable_compression,omitempty"`
}

// Storage 本地存储接口
type Storage struct {
	configPath string
	dataDir    string
}

// NewManager 创建配置管理器
func NewManager(apiBase string) *ConfigManager {
	dataDir := getdataDir()
	configPath := filepath.Join(dataDir, "nexuslink.json")

	return &ConfigManager{
		apiBase: apiBase,
		storage: &Storage{
			configPath: configPath,
			dataDir:    dataDir,
		},
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// FetchConfig 从 API 获取配置
func (cm *ConfigManager) FetchConfig(token string) (*NexusConfig, error) {
	req, err := http.NewRequest("GET", cm.apiBase+"/api/nexus/config", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := cm.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("获取配置失败")
	}

	var config NexusConfig
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
		return nil, err
	}

	cm.mu.Lock()
	cm.config = &config
	cm.mu.Unlock()

	return &config, nil
}

// SaveToLocal 保存配置到本地
func (cm *ConfigManager) SaveToLocal(config *NexusConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(cm.storage.configPath, data, 0644); err != nil {
		return err
	}

	cm.mu.Lock()
	cm.config = config
	cm.mu.Unlock()

	return nil
}

// LoadFromLocal 从本地加载配置
func (cm *ConfigManager) LoadFromLocal() (*NexusConfig, error) {
	// 先检查内存缓存
	cm.mu.RLock()
	if cm.config != nil {
		config := cm.config
		cm.mu.RUnlock()
		return config, nil
	}
	cm.mu.RUnlock()

	// 检查文件是否存在
	if _, err := os.Stat(cm.storage.configPath); os.IsNotExist(err) {
		return nil, errors.New("配置文件不存在")
	}

	data, err := os.ReadFile(cm.storage.configPath)
	if err != nil {
		return nil, err
	}

	var config NexusConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	cm.mu.Lock()
	cm.config = &config
	cm.mu.Unlock()

	return &config, nil
}

// GetCurrentConfig 获取当前配置
func (cm *ConfigManager) GetCurrentConfig() (*NexusConfig, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	if cm.config == nil {
		return nil, errors.New("配置未加载")
	}

	return cm.config, nil
}

// GenerateTOML 生成 NexusLink 标准 TOML 配置
func (c *NexusConfig) GenerateTOML() string {
	toml := fmt.Sprintf(`# 客户端配置文件
server_addr = "%s"
server_port = %d
`, c.ServerAddr, c.ServerPort)

	if c.AuthType != "" {
		toml += fmt.Sprintf(`auth_type = "%s"
`, c.AuthType)
	}
	if c.AuthToken != "" {
		toml += fmt.Sprintf(`token = "%s"
`, c.AuthToken)
	}
	if c.EnableCompression {
		toml += "enable_compression = true\n"
	}

	// TLS 配置
	if c.TLSEnable {
		toml += `
[[tls]]
enable = true
`
		if c.TLSTlsVerify {
			toml += "verify = true\n"
		}
	}

	// 代理配置
	for i, proxy := range c.Proxies {
		toml += fmt.Sprintf("\n# 代理 %d: %s\n", i+1, proxy.Name)
		toml += fmt.Sprintf("[[proxies]]\nname = \"%s\"\ntype = \"%s\"\n", proxy.Name, proxy.Type)

		switch proxy.Type {
		case "tcp", "udp":
			toml += fmt.Sprintf("local_port = %d\n", proxy.LocalPort)
			toml += fmt.Sprintf("remote_port = %d\n", proxy.RemotePort)
			if proxy.LocalAddr != "" {
				toml += fmt.Sprintf("local_ip = \"%s\"\n", proxy.LocalAddr)
			}
		case "http", "https":
			toml += fmt.Sprintf("local_port = %d\n", proxy.LocalPort)
			if len(proxy.CustomDomains) > 0 {
				toml += fmt.Sprintf("custom_domains = [%s]\n", formatDomains(proxy.CustomDomains))
			}
			if proxy.Subdomain != "" {
				toml += fmt.Sprintf("subdomain = \"%s\"\n", proxy.Subdomain)
			}
		}
	}

	return toml
}

// Helper function to format domain list
func formatDomains(domains []string) string {
	result := ""
	for i, domain := range domains {
		if i > 0 {
			result += ", "
		}
		result += fmt.Sprintf("\"%s\"", domain)
	}
	return result
}

// GetConfigDir 获取配置目录
func (cm *ConfigManager) GetConfigDir() string {
	return cm.storage.dataDir
}

// WatchConfigFile 监控配置文件变化
func (cm *ConfigManager) WatchConfigFile(callback func() error) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	defer watcher.Close()

	if err := watcher.Add(cm.storage.configPath); err != nil {
		return err
	}

	for {
		select {
		case _, ok := <-watcher.Events:
			if !ok {
				return nil
			}
			// 文件变化时重新加载
			if callback != nil {
				if err := callback(); err != nil {
					return err
				}
			}
		case err, ok := <-watcher.Errors:
			if !ok {
				return nil
			}
			return err
		}
	}
}

// getdataDir 获取数据目录
func getdataDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	dataDir := filepath.Join(homeDir, ".nexuslink")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		dataDir = "."
	}
	return dataDir
}
