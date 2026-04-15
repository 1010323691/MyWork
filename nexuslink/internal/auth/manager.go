package auth

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

// AuthManager 管理用户认证
type AuthManager struct {
	mu         sync.RWMutex
	token      string
	userInfo   *UserInfo
	apiBase    string
	httpClient *http.Client
}

// UserInfo 用户信息
type UserInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	ExpireAt int64  `json:"expire_at"`
}

// NewManager 创建认证管理器
func NewManager(apiBase string) *AuthManager {
	return &AuthManager{
		apiBase: apiBase,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Login 登录接口，前端可调用
func (am *AuthManager) Login(token string) (bool, error) {
	req, err := http.NewRequest("POST", am.apiBase+"/api/login", nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := am.httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		am.mu.Lock()
		am.token = token
		am.mu.Unlock()
		return true, nil
	}
	return false, ErrInvalidToken
}

// UserInfo 获取用户信息
func (am *AuthManager) GetUserInfo() (*UserInfo, error) {
	am.mu.RLock()
	token := am.token
	am.mu.RUnlock()

	if token == "" {
		return nil, ErrNotLoggedIn
	}

	req, err := http.NewRequest("GET", am.apiBase+"/api/user/info", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := am.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, ErrInvalidResponse
	}

	var userInfo UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	am.mu.Lock()
	am.userInfo = &userInfo
	am.mu.Unlock()

	return &userInfo, nil
}

// GetCachedUserInfo 获取缓存的用户信息
func (am *AuthManager) GetCachedUserInfo() *UserInfo {
	am.mu.RLock()
	defer am.mu.RUnlock()
	return am.userInfo
}

// Logout 登出
func (am *AuthManager) Logout() {
	am.mu.Lock()
	am.token = ""
	am.userInfo = nil
	am.mu.Unlock()
}

// IsLoggedIn 是否已登录
func (am *AuthManager) IsLoggedIn() bool {
	am.mu.RLock()
	defer am.mu.RUnlock()
	return am.token != ""
}

// GetToken 获取 Token
func (am *AuthManager) GetToken() string {
	am.mu.RLock()
	defer am.mu.RUnlock()
	return am.token
}

// SetToken 设置 Token（用于从本地存储恢复）
func (am *AuthManager) SetToken(token string) {
	am.mu.Lock()
	am.token = token
	am.mu.Unlock()
}

// 错误定义
var (
	ErrInvalidToken    = Err{code: "invalid_token", message: "无效的 Token"}
	ErrNotLoggedIn     = Err{code: "not_logged_in", message: "未登录"}
	ErrInvalidResponse = Err{code: "invalid_response", message: "无效响应"}
)

type Err struct {
	code    string
	message string
}

func (e Err) Error() string {
	return e.message
}
