package main

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"nexuslink/internal/auth"
	"nexuslink/internal/config"
	"nexuslink/internal/logger"
	"nexuslink/internal/service"
	"nexuslink/internal/storage"
)

// App struct
type App struct {
	ctx context.Context
	mu  sync.RWMutex

	// 管理器
	authManager    *auth.AuthManager
	configManager  *config.ConfigManager
	serviceManager *service.ServiceManager
	storage        *storage.LocalStorage
	logger         *logger.Logger

	// API 配置
	apiBase string
}

// NewApp creates a new App application struct
func NewApp() *App {
	// 初始化日志
	log := logger.New()
	log.Info("应用启动中...")

	// API 基础地址，可以通过环境变量或配置文件修改
	apiBase := "https://api.example.com"

	app := &App{
		apiBase:       apiBase,
		authManager:   auth.NewManager(apiBase),
		configManager: config.NewManager(apiBase),
		serviceManager: service.NewManager(),
		storage:       storage.NewLocalStorage(),
		logger:        log,
	}

	return app
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.logger.Info("应用已启动")

	// 恢复之前的登录状态
	if err := a.restoreSession(); err != nil {
		a.logger.Warn("恢复会话失败：%v", err)
	}
}

// shutdown is called when the app exits
func (a *App) shutdown(ctx context.Context) {
	a.logger.Info("应用正在关闭...")

	// 停止 NexusLink 服务
	if a.serviceManager != nil {
		a.serviceManager.Stop()
	}

	// 关闭日志
	if a.logger != nil {
		a.logger.Close()
	}
}

// ==================== 认证相关 ====================

// Login 用户登录
func (a *App) Login(token string) (bool, error) {
	a.logger.Info("用户登录尝试...")

	success, err := a.authManager.Login(token)
	if err != nil {
		a.logger.Error("登录失败：%v", err)
		return false, err
	}

	if success {
		// 保存 Token
		if err := a.storage.SaveToken(token); err != nil {
			a.logger.Warn("保存 Token 失败：%v", err)
		}

		// 获取用户信息
		if userInfo, err := a.authManager.GetUserInfo(); err == nil {
			a.logger.Info("用户 %s 登录成功", userInfo.Name)
		}

		return true, nil
	}

	return false, fmt.Errorf("登录失败")
}

// Logout 用户登出
func (a *App) Logout() error {
	a.authManager.Logout()
	a.storage.ClearToken()
	a.logger.Info("用户已登出")
	return nil
}

// IsLoggedIn 检查是否已登录
func (a *App) IsLoggedIn() bool {
	return a.authManager.IsLoggedIn()
}

// GetUserInfo 获取用户信息
func (a *App) GetUserInfo() (*auth.UserInfo, error) {
	// 先尝试获取缓存的用户信息
	if cached := a.authManager.GetCachedUserInfo(); cached != nil {
		return cached, nil
	}

	return a.authManager.GetUserInfo()
}

// ==================== 配置相关 ====================

// FetchConfig 从 API 获取 NexusLink 配置
func (a *App) FetchConfig() (*config.NexusConfig, error) {
	a.mu.RLock()
	token := a.authManager.GetToken()
	a.mu.RUnlock()

	if token == "" {
		return nil, fmt.Errorf("未登录")
	}

	a.logger.Info("正在获取 NexusLink 配置...")
	cfg, err := a.configManager.FetchConfig(token)
	if err != nil {
		a.logger.Error("获取配置失败：%v", err)
		return nil, err
	}

	// 保存到本地
	if err := a.configManager.SaveToLocal(cfg); err != nil {
		a.logger.Warn("保存配置失败：%v", err)
	}

	a.logger.Info("配置获取成功，包含 %d 个代理", len(cfg.Proxies))
	return cfg, nil
}

// LoadLocalConfig 加载本地配置
func (a *App) LoadLocalConfig() (*config.NexusConfig, error) {
	cfg, err := a.configManager.LoadFromLocal()
	if err != nil {
		return nil, err
	}
	return cfg, nil
}

// SaveConfig 保存配置
func (a *App) SaveConfig(cfgJSON string) error {
	var cfg config.NexusConfig
	if err := json.Unmarshal([]byte(cfgJSON), &cfg); err != nil {
		return err
	}

	if err := a.configManager.SaveToLocal(&cfg); err != nil {
		return err
	}

	a.logger.Info("配置已保存")
	return nil
}

// ==================== 服务管理 ====================

// StartService 启动 NexusLink 服务
func (a *App) StartService() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	cfg, err := a.configManager.LoadFromLocal()
	if err != nil {
		return fmt.Errorf("加载配置失败：%v", err)
	}

	if err := a.serviceManager.Start(cfg); err != nil {
		a.logger.Error("启动服务失败：%v", err)
		return err
	}

	a.logger.Info("NexusLink 服务已启动")
	return nil
}

// StopService 停止 NexusLink 服务
func (a *App) StopService() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if err := a.serviceManager.Stop(); err != nil {
		a.logger.Error("停止服务失败：%v", err)
		return err
	}

	a.logger.Info("NexusLink 服务已停止")
	return nil
}

// RestartService 重启 NexusLink 服务
func (a *App) RestartService() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if err := a.serviceManager.Restart(); err != nil {
		a.logger.Error("重启服务失败：%v", err)
		return err
	}

	a.logger.Info("NexusLink 服务已重启")
	return nil
}

// GetServiceStatus 获取服务状态
func (a *App) GetServiceStatus() string {
	return a.serviceManager.GetStatus()
}

// GetServiceUptime 获取服务运行时间
func (a *App) GetServiceUptime() string {
	return a.serviceManager.GetUptime()
}

// GetProxies 获取代理列表
func (a *App) GetProxies() []service.ProxyStatus {
	return a.serviceManager.GetProxies()
}

// ==================== 日志相关 ====================

// GetLogs 获取日志
func (a *App) GetLogs(limit int) []service.LogEntry {
	return a.serviceManager.GetLogs(limit)
}

// ClearLogs 清空日志
func (a *App) ClearLogs() {
	a.serviceManager.ClearLogs()
}

// ==================== 设置相关 ====================

// GetSettings 获取应用设置
func (a *App) GetSettings() (*storage.Settings, error) {
	return a.storage.GetSettings()
}

// SaveSettings 保存设置
func (a *App) SaveSettings(settingsJSON string) error {
	var settings storage.Settings
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return err
	}

	if err := a.storage.SaveSettings(&settings); err != nil {
		return err
	}

	a.logger.Info("设置已保存")
	return nil
}

// ==================== 内部方法 ====================

// restoreSession 恢复之前的会话
func (a *App) restoreSession() error {
	token, err := a.storage.GetToken()
	if err != nil {
		return nil // Token 不存在是正常的
	}

	if token != "" {
		a.authManager.SetToken(token)
		a.logger.Info("会话已恢复")
		return nil
	}

	return nil
}
