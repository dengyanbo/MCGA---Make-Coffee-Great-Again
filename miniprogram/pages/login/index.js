const app = getApp()

const LOGIN_KEY = 'loginState'

Page({
  data: {
    logging: false,
  },

  onLoad() {
    if (app.globalData.isLoggedIn) {
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }
    // Handle auto-redirect scheduled in app.js
    if (app._autoRedirectHome) {
      app._autoRedirectHome = false
      wx.reLaunch({ url: '/pages/index/index' })
    }
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

      const loginState = {
        loggedIn: true,
        loginTime: Date.now(),
        openid: result.data.openid,
      }
      wx.setStorageSync(LOGIN_KEY, loginState)

      app.globalData.isLoggedIn = true
      app.globalData.userOpenid = result.data.openid

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
