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

    this._checkLoginState()
  },

  /** Check cached login state; redirect if valid, stay on login page if not */
  _checkLoginState() {
    try {
      const state = wx.getStorageSync(LOGIN_KEY)
      if (state && state.loggedIn && state.loginTime) {
        const elapsed = Date.now() - state.loginTime
        if (elapsed < LOGIN_EXPIRY_MS) {
          this.globalData.isLoggedIn = true
          this.globalData.userOpenid = state.openid || ''
          this.globalData.nickname = state.nickname || ''
          // Already authenticated — jump to home if on login page
          const pages = getCurrentPages()
          if (!pages.length) {
            // onLaunch fires before page onLoad; schedule redirect
            this._autoRedirectHome = true
          }
          return
        }
        // Expired — clear
        wx.removeStorageSync(LOGIN_KEY)
      }
    } catch (_) { /* storage error, treat as not logged in */ }

    this.globalData.isLoggedIn = false
    this.globalData.userOpenid = ''
    this.globalData.nickname = ''
  },

  /** Called by pages to enforce login. Returns true if logged in. */
  ensureLogin() {
    if (this.globalData.isLoggedIn) return true
    wx.reLaunch({ url: '/pages/login/index' })
    return false
  },

  /** Clear login state and redirect to login page */
  logout() {
    try { wx.removeStorageSync(LOGIN_KEY) } catch (_) { /* ignore */ }
    this.globalData.isLoggedIn = false
    this.globalData.userOpenid = ''
    this.globalData.nickname = ''
    wx.reLaunch({ url: '/pages/login/index' })
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
