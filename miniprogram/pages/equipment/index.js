const app = getApp()

Page({
  data: {
    beans: [],
    grinders: [],
    filterCups: [],
    newBean: '',
    newGrinder: '',
    newFilterCup: '',
    loading: true,
  },

  async onLoad() {
    await this._loadEquipment()
  },

  onShow() {
    this._loadEquipment()
  },

  async _loadEquipment() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'getEquipment' }
      })
      if (result && result.success && result.data) {
        this.setData({
          beans: result.data.beans || [],
          grinders: result.data.grinders || [],
          filterCups: result.data.filterCups || [],
          loading: false,
        })
        app.globalData.beans = result.data.beans || []
        app.globalData.grinders = result.data.grinders || []
        app.globalData.filterCups = result.data.filterCups || []
      }
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async _save() {
    try {
      await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: {
          type: 'saveEquipment',
          beans: this.data.beans,
          grinders: this.data.grinders,
          filterCups: this.data.filterCups,
        }
      })
      app.globalData.beans = [...this.data.beans]
      app.globalData.grinders = [...this.data.grinders]
      app.globalData.filterCups = [...this.data.filterCups]
      app.syncEquipmentToCache()
    } catch (_) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // Bean
  onNewBeanInput(e) { this.setData({ newBean: e.detail.value }) },
  onAddBean() {
    const val = this.data.newBean.trim()
    if (!val) return
    if (this.data.beans.includes(val)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    const beans = [...this.data.beans, val]
    this.setData({ beans, newBean: '' })
    this._save()
  },
  onDeleteBean(e) {
    const idx = e.currentTarget.dataset.idx
    const beans = this.data.beans.filter((_, i) => i !== idx)
    this.setData({ beans })
    this._save()
  },

  // Grinder
  onNewGrinderInput(e) { this.setData({ newGrinder: e.detail.value }) },
  onAddGrinder() {
    const val = this.data.newGrinder.trim()
    if (!val) return
    if (this.data.grinders.includes(val)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    const grinders = [...this.data.grinders, val]
    this.setData({ grinders, newGrinder: '' })
    this._save()
  },
  onDeleteGrinder(e) {
    const idx = e.currentTarget.dataset.idx
    const grinders = this.data.grinders.filter((_, i) => i !== idx)
    this.setData({ grinders })
    this._save()
  },

  // Filter Cup
  onNewFilterCupInput(e) { this.setData({ newFilterCup: e.detail.value }) },
  onAddFilterCup() {
    const val = this.data.newFilterCup.trim()
    if (!val) return
    if (this.data.filterCups.includes(val)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    const filterCups = [...this.data.filterCups, val]
    this.setData({ filterCups, newFilterCup: '' })
    this._save()
  },
  onDeleteFilterCup(e) {
    const idx = e.currentTarget.dataset.idx
    const filterCups = this.data.filterCups.filter((_, i) => i !== idx)
    this.setData({ filterCups })
    this._save()
  },
})
