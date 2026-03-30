const app = getApp()

Page({
  data: {
    log: null,
    loading: true,
    loadError: false,
    deleting: false,
    qualityDims: [],
  },

  onLoad(options) {
    if (!app.globalData.isLoggedIn) {
      this.setData({ loading: false, loadError: true })
      app.requireLogin()
      return
    }
    if (options.id) {
      this._logId = options.id
      this.loadLog(options.id)
    } else {
      this.setData({ loading: false, loadError: true })
      wx.showToast({ title: '缺少记录ID', icon: 'none' })
    }
  },

  onShow() {
    if (this._needRefresh && this._logId) {
      this.loadLog(this._logId)
      this._needRefresh = false
    }
  },

  async loadLog(id) {
    this.setData({ loading: true, loadError: false })
    try {
      if (!(await app.checkConnectivity())) {
        this.setData({ loading: false, loadError: true })
        return
      }
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'getLog', id }
      })
      if (!result || !result.success) {
        throw new Error((result && result.error) || '记录不存在或已被删除')
      }
      const log = result.data
      if (!log) {
        throw new Error('记录不存在或已被删除')
      }
      const qualityDims = [
        { label: '香气', score: log.aroma || 0 },
        { label: '酸质', score: log.acidity || 0 },
        { label: '甜度', score: log.sweetness || 0 },
        { label: '醇厚度', score: log.body || 0 },
        { label: '余韵', score: log.aftertaste || 0 },
      ]
      const overallScore = log.overall || 0
      this.setData({ log, qualityDims, overallScore, loading: false, loadError: false })
    } catch (err) {
      console.error('Load log failed:', err)
      const errorMsg = app.getErrorMessage(err)
      this.setData({ loading: false, loadError: true })
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 })
    }
  },

  onRetry() {
    if (this._logId) {
      this.loadLog(this._logId)
    }
  },

  onEdit() {
    if (!this._logId || !this.data.log) {
      wx.showToast({ title: '记录尚未加载', icon: 'none' })
      return
    }
    this._needRefresh = true
    wx.navigateTo({ url: `/pages/add-log/index?id=${this._logId}` })
  },

  onDelete() {
    if (!this._logId || !this.data.log) {
      wx.showToast({ title: '记录尚未加载', icon: 'none' })
      return
    }
    if (this.data.deleting) return

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmColor: '#A0522D',
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ deleting: true })
        try {
          if (!(await app.checkConnectivity())) {
            this.setData({ deleting: false })
            return
          }
          const { result } = await wx.cloud.callFunction({
            name: 'coffeeLogFunctions',
            data: { type: 'deleteLog', id: this._logId }
          })
          if (!result || !result.success) {
            throw new Error((result && result.error) || '删除失败')
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 800)
        } catch (err) {
          console.error('Delete failed:', err)
          const errorMsg = app.getErrorMessage(err)
          wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 })
        }
        this.setData({ deleting: false })
      },
      fail: () => {
        // Modal display failed, silently ignore
      }
    })
  },

  onShareAppMessage() {
    const log = this.data.log
    if (!log) {
      return {
        title: 'MCGA Coffee ☕',
        path: '/pages/index/index',
      }
    }
    return {
      title: `${log.beanName || '咖啡记录'} - ${log.overall || '?'}/5 ☕`,
      path: `/pages/log-detail/index?id=${this._logId}`,
    }
  },
})
