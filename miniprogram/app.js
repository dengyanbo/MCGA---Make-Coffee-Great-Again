const { cloudEnvId } = require('./config.local')
const LOGIN_KEY = 'loginState'
const LOGIN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      this.globalData.cloudReady = false
      return
    }
    try {
      wx.cloud.init({ env: cloudEnvId, traceUser: true })
      this.globalData.cloudReady = true
    } catch (err) {
      console.error('云开发初始化失败:', err)
      this.globalData.cloudReady = false
    }

    this._restoreLoginState()
  },

  /** Restore cached login state silently (no redirect) */
  _restoreLoginState() {
    try {
      const state = wx.getStorageSync(LOGIN_KEY)
      if (state && state.loggedIn && state.loginTime) {
        const elapsed = Date.now() - state.loginTime
        if (elapsed < LOGIN_EXPIRY_MS) {
          this.globalData.isLoggedIn = true
          this.globalData.userOpenid = state.openid || ''
          this.globalData.nickname = state.nickname || ''
          this.globalData.onboardingDone = state.onboardingDone || false
          this.globalData.grinders = state.grinders || []
          this.globalData.filterCups = state.filterCups || []
          return
        }
        wx.removeStorageSync(LOGIN_KEY)
      }
    } catch (_) { /* storage error, treat as not logged in */ }

    this.globalData.isLoggedIn = false
    this.globalData.userOpenid = ''
    this.globalData.nickname = ''
  },

  /** Returns true if logged in (does NOT redirect) */
  isLoggedIn() {
    return this.globalData.isLoggedIn
  },

  /** Show login prompt modal. Navigates to login page if user confirms. */
  requireLogin() {
    if (this.globalData.isLoggedIn) return Promise.resolve(true)
    return new Promise((resolve) => {
      wx.showModal({
        title: '需要登录',
        content: '登录后才能使用此功能，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        confirmColor: '#1C1C1E',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/index' })
          }
          resolve(false)
        },
        fail: () => resolve(false)
      })
    })
  },

  /** Clear login state and go to home page */
  logout() {
    try { wx.removeStorageSync(LOGIN_KEY) } catch (_) { /* ignore */ }
    this.globalData.isLoggedIn = false
    this.globalData.userOpenid = ''
    this.globalData.nickname = ''
    wx.reLaunch({ url: '/pages/index/index' })
  },

  onError(err) {
    console.error('App onError:', err)
  },

  onUnhandledRejection({ reason }) {
    console.error('Unhandled rejection:', reason)
  },

  globalData: {
    cloudReady: false,
    isLoggedIn: false,
    userOpenid: '',
    nickname: '',
    onboardingDone: false,
    grinders: [],
    filterCups: [],
  },

  /** Check cloud + network, show toast on failure. Returns true if OK. */
  async checkConnectivity() {
    if (!this.globalData.cloudReady) {
      wx.showToast({ title: '云服务未就绪，请稍后再试', icon: 'none', duration: 2000 })
      return false
    }
    try {
      const res = await wx.getNetworkType()
      if (res.networkType === 'none') {
        wx.showToast({ title: '当前无网络连接', icon: 'none', duration: 2000 })
        return false
      }
    } catch (_) { /* ignore */ }
    return true
  },

  /** Classify error and return user-friendly message */
  getErrorMessage(err) {
    const msg = (err && (err.message || err.errMsg || String(err))) || ''
    if (msg.includes('timeout') || msg.includes('Timeout'))
      return '请求超时，请检查网络后重试'
    if (msg.includes('request:fail') || msg.includes('ERR_CONNECTION') || msg.includes('网络'))
      return '网络连接失败，请检查网络'
    if (msg.includes('-1') || msg.includes('cloud function'))
      return '服务暂不可用，请稍后重试'
    if (msg.includes('not found') || msg.includes('-502005'))
      return '云函数未部署，请先上传云函数'
    if (msg.includes('collection') || msg.includes('-502003'))
      return '数据集合不存在，请先创建 coffee_logs'
    return '操作失败，请稍后重试'
  },
})
