const app = getApp()

Page({
  data: {
    loading: true,
    loadError: false,
    stats: null,
    methodLabels: {
      pourover: '手冲',
      coldbrew: '冷萃',
    },
    methodStatsList: [],
  },

  onLoad() {
    if (!app.globalData.isLoggedIn) {
      this.setData({ loading: false, loadError: true })
      app.requireLogin()
      return
    }
    this.loadStats()
  },

  async loadStats() {
    this.setData({ loading: true, loadError: false })
    try {
      if (!(await app.checkConnectivity())) {
        this.setData({ loading: false, loadError: true })
        return
      }
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'getStats' }
      })
      if (!result || !result.success) {
        throw new Error((result && result.error) || '获取统计数据失败')
      }
      const stats = result.data
      if (!stats) throw new Error('服务器返回数据为空')

      let methodStatsList = []
      if (stats.methodCounts) {
        methodStatsList = Object.entries(stats.methodCounts)
          .map(([method, count]) => ({
            method,
            label: this.data.methodLabels[method] || method,
            count,
          }))
          .sort((a, b) => b.count - a.count)
      }

      this.setData({ stats, methodStatsList, loading: false, loadError: false })
    } catch (err) {
      console.error('Failed to load stats:', err)
      this.setData({ loading: false, loadError: true })
      wx.showToast({ title: app.getErrorMessage(err), icon: 'none', duration: 2500 })
    }
  },

  onRetry() {
    this.loadStats()
  },
})
