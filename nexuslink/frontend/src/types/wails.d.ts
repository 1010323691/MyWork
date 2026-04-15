// Wails Go bindings
export interface WailsGo {
  Auth: {
    Login(token: string): Promise<boolean>
    Logout(): Promise<boolean>
    GetUserInfo(): Promise<UserInfo>
    IsLoggedIn(): Promise<boolean>
  }
  Config: {
    FetchConfig(): Promise<FrpConfig>
    LoadLocalConfig(): Promise<FrpConfig>
    SaveConfig(config: FrpConfig): Promise<boolean>
  }
  Service: {
    StartService(): Promise<boolean>
    StopService(): Promise<boolean>
    RestartService(): Promise<boolean>
    GetServiceStatus(): string
    GetServiceUptime(): string
    GetProxies(): Promise<ProxyStatus[]>
    FetchFrpConfig(): Promise<string>
    GetLogs(limit: number): LogEntry[]
    ClearLogs(): void
  }
  Settings: {
    GetSettings(): Promise<Settings>
    SaveSettings(settings: string): Promise<boolean>
  }
}

export interface UserInfo {
  id: string
  name: string
  email: string
  expire_at?: number
}

export interface FrpConfig {
  server_addr: string
  server_port: number
  auth_type?: string
  auth_token?: string
  proxies: Proxy[]
  tls_enable?: boolean
  tls_verify?: boolean
  enable_compression?: boolean
}

export interface Proxy {
  name: string
  type: string
  local_port: number
  remote_port?: number
  local_addr?: string
  custom_domains?: string[]
  subdomain?: string
}

export interface ProxyStatus {
  name: string
  type: string
  local_port: number
  remote_port: number
  status: 'online' | 'offline'
}

export interface LogEntry {
  time: string
  level: string
  message: string
}

export interface Settings {
  autoStart: boolean
  minToTray: boolean
  theme: 'light' | 'dark' | 'auto'
  language: string
  lastWindowSize: [number, number]
  lastWindowPos: [number, number]
}

declare global {
  interface Window {
    go: WailsGo
  }
}

export {}
