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
    methodList: [],
    scoreDims: [],
  },

  onLoad() {
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
      const methodList = Object.entries(stats.methodCounts || {})
        .map(([method, count]) => ({
          method,
          label: this.data.methodLabels[method] || method,
          count,
          percent: stats.totalBrews ? Math.round(count / stats.totalBrews * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)

      const dimLabels = {
        aroma: '香气', acidity: '酸质', sweetness: '甜度',
        body: '醇厚度', aftertaste: '余韵', overall: '综合'
      }
      const scoreDims = Object.entries(stats.avgScores || {})
        .map(([dim, score]) => ({
          dim,
          label: dimLabels[dim] || dim,
          score,
          percent: score / 5 * 100,
        }))

      this.setData({ stats, methodList, scoreDims, loading: false, loadError: false })
    } catch (err) {
      console.error('Failed to load stats:', err)
      const errorMsg = app.getErrorMessage(err)
      this.setData({ loading: false, loadError: true })
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2500 })
    }
  },

  onRetry() {
    this.loadStats()
  },
})
