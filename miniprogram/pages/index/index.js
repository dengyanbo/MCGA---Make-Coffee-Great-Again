const app = getApp()
const INITIAL_SIZE = 3
const PAGE_SIZE = 10
const CACHE_KEY_PREFIX = 'logCache_'

function _cacheKey(filter) {
  return CACHE_KEY_PREFIX + (filter || 'all')
}

Page({
  data: {
    logs: [],
    loading: true,
    hasMore: true,
    isEmpty: false,
    loadError: false,
    isGuest: false,
    nickname: '',

    // Stats summary
    stats: null,

    // Filters
    activeFilter: 'all', // all, good, bad
    filterTabs: [
      { key: 'all', label: '全部' },
      { key: 'good', label: '好喝' },
      { key: 'bad', label: '难喝' },
    ],

    // Custom nav bar
    statusBarHeight: 0,
    navBarTop: 0,
    navBarHeight: 0,
  },

  _offset: 0,
  _loading: false,
  _needRefresh: false,
  _initialLoaded: false,

  onLoad() {
    // Get capsule button position for custom nav bar alignment
    const menuBtn = wx.getMenuButtonBoundingClientRect()
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      nickname: app.globalData.nickname || '',
      statusBarHeight: sysInfo.statusBarHeight,
      navBarTop: menuBtn.top,
      navBarHeight: menuBtn.height,
    })
    if (app.globalData.isLoggedIn) {
      this._showCachedThenRefresh()
    } else {
      this.setData({ loading: false, isGuest: true })
    }
  },

  onShow() {
    this.setData({ nickname: app.globalData.nickname || '' })
    if (app.globalData.isLoggedIn && this.data.isGuest) {
      this.setData({ isGuest: false })
      this._showCachedThenRefresh()
    } else if (this._needRefresh) {
      this._needRefresh = false
      this._showCachedThenRefresh()
    }
  },

  onPullDownRefresh() {
    this._loadAll()
  },

  /** Show cached records instantly, then fetch fresh initial page from server */
  _showCachedThenRefresh() {
    const cached = this._getCache(this.data.activeFilter)
    if (cached && cached.length > 0) {
      this.setData({ logs: cached, loading: false, hasMore: true, isEmpty: false })
    }
    this._loadAll()
  },

  _loadAll() {
    this._offset = 0
    this._initialLoaded = false
    if (this.data.logs.length === 0) {
      this.setData({ logs: [], hasMore: true, loadError: false, loading: true })
    } else {
      this.setData({ hasMore: true, loadError: false })
    }
    this._loadStats()
    this._loadFilteredLogs(true)
  },

  async _loadStats() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'getStats' }
      })
      if (result && result.success) {
        this.setData({ stats: result.data })
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  },

  async _loadFilteredLogs(isReset) {
    if (this._loading) return
    if (!(await app.checkConnectivity())) {
      this.setData({ loading: false, loadError: true })
      wx.stopPullDownRefresh()
      return
    }
    this._loading = true
    if (this.data.logs.length === 0) {
      this.setData({ loading: true, loadError: false })
    }

    const isInitial = isReset && !this._initialLoaded
    const pageSize = isInitial ? INITIAL_SIZE : PAGE_SIZE

    const filters = {}
    if (this.data.activeFilter === 'good') filters.taste = 'good'
    else if (this.data.activeFilter === 'bad') filters.taste = 'bad'

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: {
          type: 'getFilteredLogs',
          filters,
          skip: this._offset,
          pageSize,
        }
      })
      if (!result || !result.success) {
        throw new Error((result && result.error) || '服务器返回异常')
      }
      const newLogs = result.data || []
      const logs = isReset ? newLogs : [...this.data.logs, ...newLogs]
      this._offset = logs.length
      if (isInitial) this._initialLoaded = true
      this.setData({
        logs,
        loading: false,
        hasMore: newLogs.length >= pageSize,
        isEmpty: logs.length === 0,
        loadError: false,
      })
      // Cache the first INITIAL_SIZE records for instant display next time
      if (isReset) {
        this._setCache(this.data.activeFilter, logs.slice(0, INITIAL_SIZE))
      }
    } catch (err) {
      console.error('Failed to load logs:', err)
      this.setData({
        loading: false,
        loadError: this.data.logs.length === 0,
      })
      wx.showToast({ title: app.getErrorMessage(err), icon: 'none', duration: 2500 })
    } finally {
      this._loading = false
      wx.stopPullDownRefresh()
    }
  },

  _getCache(filter) {
    try {
      return wx.getStorageSync(_cacheKey(filter)) || null
    } catch (_) { return null }
  },

  _setCache(filter, logs) {
    try {
      wx.setStorageSync(_cacheKey(filter), logs)
    } catch (_) { /* ignore */ }
  },

  onFilterChange(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeFilter) return
    this.setData({ activeFilter: key })
    this._offset = 0
    this._initialLoaded = false
    // Show cached records for the new filter immediately
    const cached = this._getCache(key)
    if (cached && cached.length > 0) {
      this.setData({ logs: cached, hasMore: true, isEmpty: false })
    } else {
      this.setData({ logs: [], hasMore: true })
    }
    this._loadFilteredLogs(true)
  },

  onShowMore() {
    if (this.data.hasMore && !this.data.loading) {
      this._loadFilteredLogs(false)
    }
  },

  onRetry() {
    this._loadAll()
  },

  onAddLog() {
    this._needRefresh = true
    wx.navigateTo({ url: '/pages/add-log/index' })
  },

  onGoBrew() {
    if (!app.globalData.isLoggedIn) {
      app.requireLogin()
      return
    }
    this._needRefresh = true
    wx.navigateTo({ url: '/pages/brew/index' })
  },

  onTapLog(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      wx.showToast({ title: '无法打开该记录', icon: 'none' })
      return
    }
    this._needRefresh = true
    wx.navigateTo({ url: `/pages/log-detail/index?id=${id}` })
  },

  onGoEquipment() {
    if (!app.globalData.isLoggedIn) {
      app.requireLogin()
      return
    }
    wx.navigateTo({ url: '/pages/equipment/index' })
  },

  onGoStats() {
    if (!app.globalData.isLoggedIn) {
      app.requireLogin()
      return
    }
    wx.navigateTo({ url: '/pages/stats/index' })
  },

  onGoAccount() {
    wx.navigateTo({ url: '/pages/login/index' })
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },
})
