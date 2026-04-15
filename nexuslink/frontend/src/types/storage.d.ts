export interface Settings {
  autoStart: boolean
  minToTray: boolean
  theme: 'light' | 'dark' | 'auto'
  language: string
  lastWindowSize: [number, number]
  lastWindowPos: [number, number]
}
