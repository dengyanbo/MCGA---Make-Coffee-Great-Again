const app = getApp()
const INITIAL_SIZE = 5
const LOAD_MORE_SIZE = 10

Page({
  data: {
    logs: [],
    loading: true,
    hasMore: true,
    isEmpty: false,
    loadError: false,
    isInitialLoad: true,
  },

  _needRefresh: true,
  _offset: 0,

  onLoad() {
    if (!app.ensureLogin()) return
    this.loadLogs()
  },

  onShow() {
    if (this._needRefresh) {
      this._offset = 0
      this.setData({ logs: [], hasMore: true, loadError: false, isInitialLoad: true })
      this.loadLogs()
      this._needRefresh = false
    }
  },

  onPullDownRefresh() {
    this._offset = 0
    this.setData({ logs: [], hasMore: true, loadError: false, isInitialLoad: true })
    this.loadLogs().finally(() => wx.stopPullDownRefresh())
  },

  async loadLogs() {
    if (!(await app.checkConnectivity())) {
      this.setData({ loading: false, loadError: true })
      return
    }
    this.setData({ loading: true, loadError: false })
    const pageSize = this.data.isInitialLoad ? INITIAL_SIZE : LOAD_MORE_SIZE
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: {
          type: 'getLogs',
          skip: this._offset,
          pageSize,
        }
      })
      if (!result || !result.success) {
        throw new Error((result && result.error) || '服务器返回异常')
      }
      const newLogs = result.data || []
      const logs = [...this.data.logs, ...newLogs]
      this._offset += newLogs.length
      this.setData({
        logs,
        loading: false,
        hasMore: newLogs.length >= pageSize,
        isEmpty: logs.length === 0,
        loadError: false,
        isInitialLoad: false,
      })
    } catch (err) {
      console.error('Failed to load logs:', err)
      const errorMsg = app.getErrorMessage(err)
      this.setData({
        loading: false,
        loadError: this.data.logs.length === 0,
        isEmpty: false,
      })
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 })
    }
  },

  onShowMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLogs()
    }
  },

  onRetry() {
    this.setData({ logs: [], page: 0, hasMore: true, loadError: false })
    this.loadLogs()
  },

  onAddLog() {
    this._needRefresh = true
    wx.navigateTo({ url: '/pages/add-log/index' })
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
    wx.navigateTo({ url: '/pages/stats/index' })
  },
})
