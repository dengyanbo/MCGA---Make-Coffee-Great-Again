const app = getApp()

const LOGIN_KEY = 'loginState'

Page({
  data: {
    logging: false,
    showLoggedInState: false,
    nickname: '',
  },

  onLoad(options) {
    // Auto-redirect on app cold launch
    if (app._autoRedirectHome) {
      app._autoRedirectHome = false
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }
    // Already logged in — show account management (user clicked built-in home button)
    if (app.globalData.isLoggedIn) {
      this.setData({
        showLoggedInState: true,
        nickname: app.globalData.nickname || ''
      })
      return
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  async onContinue() {
    const nickname = this.data.nickname.trim()
    app.globalData.nickname = nickname
    try {
      const state = wx.getStorageSync(LOGIN_KEY)
      if (state) {
        state.nickname = nickname
        wx.setStorageSync(LOGIN_KEY, state)
      }
    } catch (_) { /* ignore */ }

    // Save to cloud (fire and forget)
    try {
      wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'updateNickname', nickname }
      })
    } catch (_) { /* ignore */ }

    wx.reLaunch({ url: '/pages/index/index' })
  },

  onLogout() {
    app.logout()
  },

  async onLogin() {
    if (this.data.logging) return
    this.setData({ logging: true })

    try {
      await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject })
      })

      if (!(await app.checkConnectivity())) {
        this.setData({ logging: false })
        return
      }

      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'login' },
      })

      if (!result || !result.success) {
        throw new Error((result && result.error) || '登录失败')
      }

      const inputNickname = this.data.nickname.trim()
      const nickname = inputNickname || result.data.nickname || ''

      const loginState = {
        loggedIn: true,
        loginTime: Date.now(),
        openid: result.data.openid,
        nickname,
      }
      wx.setStorageSync(LOGIN_KEY, loginState)

      app.globalData.isLoggedIn = true
      app.globalData.userOpenid = result.data.openid
      app.globalData.nickname = nickname

      // Save nickname to cloud if user entered one
      if (inputNickname) {
        try {
          wx.cloud.callFunction({
            name: 'coffeeLogFunctions',
            data: { type: 'updateNickname', nickname: inputNickname }
          })
        } catch (_) { /* ignore */ }
      }

      wx.reLaunch({ url: '/pages/index/index' })
    } catch (err) {
      console.error('Login failed:', err)
      wx.showToast({
        title: app.getErrorMessage(err),
        icon: 'none',
        duration: 2500,
      })
    }
    this.setData({ logging: false })
  },
})
