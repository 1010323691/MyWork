import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Proxy {
  name: string
  type: string
  local_port: number
  remote_port?: number
  local_addr?: string
  custom_domains?: string[]
  subdomain?: string
}

export interface NexusConfig {
  server_addr: string
  server_port: number
  auth_type?: string
  auth_token?: string
  proxies: Proxy[]
  tls_enable?: boolean
  tls_verify?: boolean
  enable_compression?: boolean
}

export interface LogEntry {
  time: string
  level: string
  message: string
}

export interface ProxyStatus {
  name: string
  type: string
  local_port: number
  remote_port: number
  status: 'online' | 'offline'
}

export const useServiceStore = defineStore('service', () => {
  const status = ref<'running' | 'stopped' | 'error'>('stopped')
  const uptime = ref<string>('0s')
  const config = ref<NexusConfig | null>(null)
  const proxies = ref<ProxyStatus[]>([])
  const logs = ref<LogEntry[]>([])
  const loading = ref(false)
  const errorMessage = ref<string>('')

  const isRunning = computed(() => status.value === 'running')

  const proxyCount = computed(() => proxies.value.length)

  const statusColor = computed(() => {
    switch (status.value) {
      case 'running': return 'text-green-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  })

  const statusLabel = computed(() => {
    switch (status.value) {
      case 'running': return '运行中'
      case 'error': return '错误'
      default: return '已停止'
    }
  })

  function setStatus(newStatus: 'running' | 'stopped' | 'error') {
    status.value = newStatus
  }

  function setUptime(newUptime: string) {
    uptime.value = newUptime
  }

  function setConfig(newConfig: NexusConfig) {
    config.value = newConfig
  }

  function setProxies(newProxies: ProxyStatus[]) {
    proxies.value = newProxies
  }

  function addLog(entry: LogEntry) {
    logs.value.push(entry)
    if (logs.value.length > 1000) {
      logs.value = logs.value.slice(-1000)
    }
  }

  function addLogs(entries: LogEntry[]) {
    logs.value = [...logs.value, ...entries].slice(-1000)
  }

  function clearLogs() {
    logs.value = []
  }

  function setLoading(newLoading: boolean) {
    loading.value = newLoading
  }

  function setErrorMessage(msg: string) {
    errorMessage.value = msg
  }

  function clearErrorMessage() {
    errorMessage.value = ''
  }

  return {
    status,
    uptime,
    config,
    proxies,
    logs,
    loading,
    errorMessage,
    isRunning,
    proxyCount,
    statusColor,
    statusLabel,
    setStatus,
    setUptime,
    setConfig,
    setProxies,
    addLog,
    addLogs,
    clearLogs,
    setLoading,
    setErrorMessage,
    clearErrorMessage
  }
})
