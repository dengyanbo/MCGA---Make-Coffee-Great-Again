const app = getApp()

Page({
  data: {
    logs: [],
    loading: true,
    hasMore: true,
    page: 0,
    pageSize: 20,
    isEmpty: false,
    loadError: false,
  },

  _needRefresh: true,

  onLoad() {
    this.loadLogs()
  },

  onShow() {
    if (this._needRefresh) {
      this.setData({ logs: [], page: 0, hasMore: true, loadError: false })
      this.loadLogs()
      this._needRefresh = false
    }
  },

  onPullDownRefresh() {
    this.setData({ logs: [], page: 0, hasMore: true, loadError: false })
    this.loadLogs().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLogs()
    }
  },

  async loadLogs() {
    if (!(await app.checkConnectivity())) {
      this.setData({ loading: false, loadError: true })
      return
    }
    this.setData({ loading: true, loadError: false })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: {
          type: 'getLogs',
          page: this.data.page,
          pageSize: this.data.pageSize,
        }
      })
      if (!result || !result.success) {
        throw new Error((result && result.error) || '服务器返回异常')
      }
      const newLogs = result.data || []
      const logs = [...this.data.logs, ...newLogs]
      this.setData({
        logs,
        loading: false,
        hasMore: newLogs.length >= this.data.pageSize,
        page: this.data.page + 1,
        isEmpty: logs.length === 0,
        loadError: false,
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
