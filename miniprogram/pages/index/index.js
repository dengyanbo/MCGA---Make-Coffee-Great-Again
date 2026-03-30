const app = getApp()
const PAGE_SIZE = 20

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
  },

  _offset: 0,
  _loading: false,
  _needRefresh: false,

  onLoad() {
    this.setData({ nickname: app.globalData.nickname || '' })
    if (app.globalData.isLoggedIn) {
      this._loadAll()
    } else {
      this.setData({ loading: false, isGuest: true })
    }
  },

  onShow() {
    this.setData({ nickname: app.globalData.nickname || '' })
    if (app.globalData.isLoggedIn && this.data.isGuest) {
      this.setData({ isGuest: false })
      this._loadAll()
    } else if (this._needRefresh) {
      this._needRefresh = false
      this._loadAll()
    }
  },

  onPullDownRefresh() {
    this._loadAll()
  },

  _loadAll() {
    this._offset = 0
    this.setData({ logs: [], hasMore: true, loadError: false, loading: true })
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
    this.setData({ loading: true, loadError: false })

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
          pageSize: PAGE_SIZE,
        }
      })
      if (!result || !result.success) {
        throw new Error((result && result.error) || '服务器返回异常')
      }
      const newLogs = result.data || []
      const logs = isReset ? newLogs : [...this.data.logs, ...newLogs]
      this._offset = logs.length
      this.setData({
        logs,
        loading: false,
        hasMore: newLogs.length >= PAGE_SIZE,
        isEmpty: logs.length === 0,
        loadError: false,
      })
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

  onFilterChange(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeFilter) return
    this.setData({ activeFilter: key })
    this._offset = 0
    this.setData({ logs: [], hasMore: true })
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

  onGoStats() {
    if (!app.globalData.isLoggedIn) {
      app.requireLogin()
      return
    }
    wx.navigateTo({ url: '/pages/stats/index' })
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },
})
