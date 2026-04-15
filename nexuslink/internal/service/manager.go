package service

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"nexuslink/internal/config"
)

//go:embed frpc.exe
var frpBinary embed.FS

// ServiceManager 管理 NexusLink 服务
type ServiceManager struct {
	mu       sync.Mutex
	config   *config.NexusConfig
	running  atomic.Bool
	cmd      *exec.Cmd
	status   string
	uptime   time.Time
	logs     []LogEntry
	logMutex sync.Mutex
}

// LogEntry 日志条目
type LogEntry struct {
	Time    time.Time `json:"time"`
	Level   string   `json:"level"`
	Message string   `json:"message"`
}

// ProxyStatus 代理状态
type ProxyStatus struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	LocalPort  int    `json:"local_port"`
	RemotePort int    `json:"remote_port"`
	Status     string `json:"status"` // online, offline
}

// NewManager 创建服务管理器
func NewManager() *ServiceManager {
	return &ServiceManager{
		status: "stopped",
		logs:   make([]LogEntry, 0, 100),
	}
}

// Start 启动 frp 服务
func (sm *ServiceManager) Start(cfg *config.NexusConfig) error {
	sm.mu.Lock()
	if sm.running.Load() {
		sm.mu.Unlock()
		return errors.New("服务已运行中")
	}
	sm.mu.Unlock()

	sm.mu.Lock()
	sm.config = cfg
	sm.mu.Unlock()

	// 生成临时配置文件
	configPath, err := sm.writeConfig(cfg)
	if err != nil {
		return fmt.Errorf("写入配置文件失败：%w", err)
	}

	// 查找 frpc 可执行文件
	frpcPath := sm.findFrpClient()
	if frpcPath == "" {
		return errors.New("未找到 frpc 可执行文件")
	}

	// 启动 frpc 进程
	sm.cmd = exec.Command(frpcPath, "-c", configPath)
	sm.cmd.Stdout = nil
	sm.cmd.Stderr = nil
	sm.cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}

	if err := sm.cmd.Start(); err != nil {
		return fmt.Errorf("启动服务失败：%w", err)
	}

	sm.running.Store(true)
	sm.uptime = time.Now()
	sm.setStatus("running")
	sm.addLog("info", "NexusLink 服务已启动")

	return nil
}

// Stop 停止 NexusLink 服务
func (sm *ServiceManager) Stop() error {
	sm.mu.Lock()
	if !sm.running.Load() {
		sm.mu.Unlock()
		return errors.New("服务未运行")
	}
	sm.mu.Unlock()

	if sm.cmd != nil && sm.cmd.Process != nil {
		if err := sm.cmd.Process.Kill(); err != nil {
			return fmt.Errorf("停止服务失败：%w", err)
		}
		sm.addLog("info", "NexusLink 服务已停止")
	}

	sm.running.Store(false)
	sm.setStatus("stopped")

	// 清理临时配置文件
	if sm.config != nil {
		sm.cleanupConfig()
	}

	return nil
}

// Restart 重启 NexusLink 服务
func (sm *ServiceManager) Restart() error {
	if sm.running.Load() {
		if err := sm.Stop(); err != nil {
			return err
		}
		time.Sleep(1 * time.Second)
	}
	return sm.Start(sm.config)
}

// GetStatus 获取服务状态
func (sm *ServiceManager) GetStatus() string {
	return sm.status
}

// GetUptime 获取运行时间
func (sm *ServiceManager) GetUptime() string {
	if !sm.running.Load() || sm.uptime.IsZero() {
		return "0s"
	}
	elapsed := time.Since(sm.uptime)
	return elapsed.String()
}

// GetProxies 获取代理列表
func (sm *ServiceManager) GetProxies() []ProxyStatus {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if sm.config == nil {
		return []ProxyStatus{}
	}

	proxies := make([]ProxyStatus, len(sm.config.Proxies))
	for i, p := range sm.config.Proxies {
		proxies[i] = ProxyStatus{
			Name:       p.Name,
			Type:       p.Type,
			LocalPort:  p.LocalPort,
			RemotePort: p.RemotePort,
			Status:     "online",
		}
	}
	return proxies
}

// GetLogs 获取日志
func (sm *ServiceManager) GetLogs(limit int) []LogEntry {
	sm.logMutex.Lock()
	defer sm.logMutex.Unlock()

	if len(sm.logs) <= limit {
		return sm.logs
	}
	return sm.logs[len(sm.logs)-limit:]
}

// ClearLogs 清空日志
func (sm *ServiceManager) ClearLogs() {
	sm.logMutex.Lock()
	defer sm.logMutex.Unlock()
	sm.logs = make([]LogEntry, 0, 100)
}

// addLog 添加日志条目
func (sm *ServiceManager) addLog(level, message string) {
	sm.logMutex.Lock()
	defer sm.logMutex.Unlock()

	if len(sm.logs) >= 1000 {
		sm.logs = sm.logs[1:]
	}

	sm.logs = append(sm.logs, LogEntry{
		Time:    time.Now(),
		Level:   level,
		Message: message,
	})
}

// setStatus 设置状态
func (sm *ServiceManager) setStatus(status string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.status = status
}

// writeConfig 写入配置文件
func (sm *ServiceManager) writeConfig(cfg *config.NexusConfig) (string, error) {
	dataDir := sm.getConfigDir()
	configPath := filepath.Join(dataDir, "nexuslink.toml")

	// 生成 TOML 配置
	tomlContent := sm.generateTOML(cfg)

	if err := os.WriteFile(configPath, []byte(tomlContent), 0644); err != nil {
		return "", err
	}

	return configPath, nil
}

// cleanupConfig 清理配置文件
func (sm *ServiceManager) cleanupConfig() {
	configPath := filepath.Join(sm.getConfigDir(), "nexuslink.toml")
	os.Remove(configPath)
}

// getConfigDir 获取配置目录
func (sm *ServiceManager) getConfigDir() string {
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

// findFrpClient 查找 frpc 可执行文件 (frp 客户端)
// 优先使用嵌入的 frpc，运行时解压到临时目录
func (sm *ServiceManager) findFrpClient() string {
	// 获取嵌入的 frpc.exe
	data, err := frpBinary.ReadFile("frpc.exe")
	if err != nil {
		sm.addLog("error", fmt.Sprintf("读取嵌入的 frpc.exe 失败：%v", err))
		return ""
	}

	// 创建临时文件
	tempDir := os.TempDir()
	frpcPath := filepath.Join(tempDir, "nexuslink-frpc.exe")

	// 写入临时文件
	if err := os.WriteFile(frpcPath, data, 0755); err != nil {
		sm.addLog("error", fmt.Sprintf("写入 frpc.exe 临时文件失败：%v", err))
		return ""
	}

	sm.addLog("info", fmt.Sprintf("frpc.exe 已解压到：%s", frpcPath))
	return frpcPath
}

// generateTOML 生成 TOML 配置
func (sm *ServiceManager) generateTOML(cfg *config.NexusConfig) string {
	toml := fmt.Sprintf(`# NexusLink 客户端配置文件
server_addr = "%s"
server_port = %d
`, cfg.ServerAddr, cfg.ServerPort)

	if cfg.AuthType != "" {
		toml += fmt.Sprintf(`auth_type = "%s"
`, cfg.AuthType)
	}
	if cfg.AuthToken != "" {
		toml += fmt.Sprintf(`token = "%s"
`, cfg.AuthToken)
	}
	if cfg.EnableCompression {
		toml += "enable_compression = true\n"
	}

	// 代理配置
	for i, proxy := range cfg.Proxies {
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
		}
	}

	return toml
}

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

// GetConfig 获取当前配置
func (sm *ServiceManager) GetConfig() *config.NexusConfig {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	return sm.config
}

// SetConfig 设置配置
func (sm *ServiceManager) SetConfig(cfg *config.NexusConfig) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.config = cfg
}

// LogData 用于序列化的日志数据
type LogData struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	Time    string `json:"time"`
}

// GetLogsJSON 获取日志的 JSON 格式
func (sm *ServiceManager) GetLogsJSON() string {
	sm.logMutex.Lock()
	defer sm.logMutex.Unlock()

	logs := make([]LogData, len(sm.logs))
	for i, log := range sm.logs {
		logs[i] = LogData{
			Level:   log.Level,
			Message: log.Message,
			Time:    log.Time.Format("2006-01-02 15:04:05"),
		}
	}

	data, _ := json.Marshal(logs)
	return string(data)
}
