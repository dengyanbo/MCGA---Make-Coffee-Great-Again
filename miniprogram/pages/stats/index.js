const app = getApp()

Page({
  data: {
    loading: true,
    loadError: false,
    stats: null,
    methodLabels: {
      pourover: '手冲',
      espresso: '意式',
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
      if (!stats) {
        throw new Error('服务器返回数据为空')
      }

      const dimLabels = {
        aroma: '香气', acidity: '酸质', sweetness: '甜度',
        body: '醇厚度', aftertaste: '余韵', overall: '综合'
      }

      // Build per-method collapsible list
      let methodStatsList = []
      if (stats.methodStats && Object.keys(stats.methodStats).length > 0) {
        // New cloud function with per-method data
        methodStatsList = Object.entries(stats.methodStats)
          .map(([method, data]) => {
            const scoreDims = Object.entries(data.avgScores || {})
              .map(([dim, score]) => ({
                dim,
                label: dimLabels[dim] || dim,
                score,
                percent: score / 5 * 100,
              }))
            return {
              method,
              label: this.data.methodLabels[method] || method,
              count: data.count,
              avgOverall: data.avgOverall,
              scoreDims,
              logs: data.logs || [],
              expanded: false,
            }
          })
          .sort((a, b) => b.count - a.count)
      } else if (stats.methodCounts && Object.keys(stats.methodCounts).length > 0) {
        // Fallback: old cloud function without methodStats
        const overallScoreDims = Object.entries(stats.avgScores || {})
          .map(([dim, score]) => ({
            dim,
            label: dimLabels[dim] || dim,
            score,
            percent: score / 5 * 100,
          }))
        methodStatsList = Object.entries(stats.methodCounts)
          .map(([method, count]) => ({
            method,
            label: this.data.methodLabels[method] || method,
            count,
            avgOverall: stats.avgOverall,
            scoreDims: overallScoreDims,
            logs: [],
            expanded: false,
          }))
          .sort((a, b) => b.count - a.count)
      }

      this.setData({ stats, methodStatsList, loading: false, loadError: false })
    } catch (err) {
      console.error('Failed to load stats:', err)
      const errorMsg = app.getErrorMessage(err)
      this.setData({ loading: false, loadError: true })
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 })
    }
  },

  onToggleMethod(e) {
    const method = e.currentTarget.dataset.method
    const methodStatsList = this.data.methodStatsList.map(item => {
      if (item.method === method) {
        return { ...item, expanded: !item.expanded }
      }
      return item
    })
    this.setData({ methodStatsList })
  },

  onRetry() {
    this.loadStats()
  },
})
