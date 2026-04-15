import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserInfo {
  id: string
  name: string
  email: string
  expire_at?: number
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('')
  const userInfo = ref<UserInfo | null>(null)
  const isLoggedIn = ref(false)

  const isLoginValid = computed(() => {
    return token.value.length > 0
  })

  function setToken(newToken: string) {
    token.value = newToken
    isLoggedIn.value = true
    localStorage.setItem('isLoggedIn', 'true')
  }

  function setUserInfo(info: UserInfo) {
    userInfo.value = info
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    isLoggedIn.value = false
    localStorage.removeItem('isLoggedIn')
  }

  function checkLoginStatus() {
    isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true'
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isLoginValid,
    setToken,
    setUserInfo,
    logout,
    checkLoginStatus
  }
})
