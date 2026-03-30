const app = getApp()

Page({
  data: {
    step: 1, // 1 = grinders, 2 = filterCups
    grinders: [],
    filterCups: [],
    currentItems: [],
    inputValue: '',
    saving: false,
    animateIn: false,
  },

  onLoad() {
    setTimeout(() => this.setData({ animateIn: true }), 100)
  },

  _syncCurrentItems() {
    const items = this.data.step === 1 ? this.data.grinders : this.data.filterCups
    this.setData({ currentItems: items })
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onAddItem() {
    const value = this.data.inputValue.trim()
    if (!value) return
    if (this.data.step === 1) {
      if (this.data.grinders.includes(value)) {
        wx.showToast({ title: '已添加过该型号', icon: 'none' })
        return
      }
      this.setData({
        grinders: [...this.data.grinders, value],
        inputValue: ''
      })
    } else {
      if (this.data.filterCups.includes(value)) {
        wx.showToast({ title: '已添加过该型号', icon: 'none' })
        return
      }
      this.setData({
        filterCups: [...this.data.filterCups, value],
        inputValue: ''
      })
    }
    this._syncCurrentItems()
  },

  onRemoveItem(e) {
    const idx = e.currentTarget.dataset.index
    if (this.data.step === 1) {
      const grinders = this.data.grinders.filter((_, i) => i !== idx)
      this.setData({ grinders })
    } else {
      const filterCups = this.data.filterCups.filter((_, i) => i !== idx)
      this.setData({ filterCups })
    }
    this._syncCurrentItems()
  },

  onNext() {
    if (this.data.step === 1) {
      if (this.data.grinders.length === 0) {
        wx.showToast({ title: '请至少添加一个磨豆机', icon: 'none' })
        return
      }
      this.setData({ step: 2, inputValue: '', animateIn: false })
      this._syncCurrentItems()
      setTimeout(() => this.setData({ animateIn: true }), 50)
    } else {
      this.onComplete()
    }
  },

  onSkip() {
    if (this.data.step === 1) {
      this.setData({ step: 2, inputValue: '', animateIn: false })
      this._syncCurrentItems()
      setTimeout(() => this.setData({ animateIn: true }), 50)
    } else {
      this.onComplete()
    }
  },

  async onComplete() {
    if (this.data.saving) return
    this.setData({ saving: true })

    try {
      // Save equipment
      await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: {
          type: 'saveEquipment',
          grinders: this.data.grinders,
          filterCups: this.data.filterCups,
        }
      })

      // Complete onboarding
      await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'completeOnboarding' }
      })

      // Update global state
      app.globalData.onboardingDone = true
      app.globalData.grinders = this.data.grinders
      app.globalData.filterCups = this.data.filterCups

      // Update local storage
      try {
        const state = wx.getStorageSync('loginState')
        if (state) {
          state.onboardingDone = true
          state.grinders = this.data.grinders
          state.filterCups = this.data.filterCups
          wx.setStorageSync('loginState', state)
        }
      } catch (_) {}

      wx.reLaunch({ url: '/pages/index/index' })
    } catch (err) {
      console.error('Onboarding save failed:', err)
      wx.showToast({ title: app.getErrorMessage(err), icon: 'none', duration: 2500 })
    }
    this.setData({ saving: false })
  },
})
