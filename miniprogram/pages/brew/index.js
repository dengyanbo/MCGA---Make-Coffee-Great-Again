const app = getApp()

Page({
  data: {
    state: 'A', // A=choose method, B=set params, C=timer, D=feedback

    // State B params
    waterTemp: 93,
    filterCup: '',
    brewTechnique: 'yidaoliu', // yidaoliu or sanduanshi
    techniqueLabels: { yidaoliu: '一刀流', sanduanshi: '三段式' },

    // State C timer
    timerRunning: false,
    elapsedTime: 0,
    totalTime: 0,
    steps: [],
    currentStepIndex: 0,
    currentStep: null,
    timerDone: false,

    // State D feedback
    taste: '',
    showBadReasons: false,
    badReasons: [],
    customReason: '',
    saving: false,

    // Temp picker
    tempPickerVisible: false,
    tempValues: [],
    tempPickerIndex: [0],

    animateIn: false,
  },

  onLoad() {
    // Set default filter cup from global data
    const filterCups = app.globalData.filterCups || []
    const filterCup = filterCups.length > 0 ? filterCups[0] : ''
    
    // Generate temp values (80-100)
    const tempValues = []
    for (let t = 80; t <= 100; t++) tempValues.push(t)
    const tempIdx = tempValues.indexOf(93)
    
    this.setData({ 
      filterCup, 
      tempValues,
      tempPickerIndex: [tempIdx >= 0 ? tempIdx : 13],
    })
    setTimeout(() => this.setData({ animateIn: true }), 100)
  },

  onUnload() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  // State A
  onChoosePourover() {
    this.setData({ state: 'B', animateIn: false })
    setTimeout(() => this.setData({ animateIn: true }), 50)
  },

  onChooseColdbrew() {
    wx.showToast({ title: '冷萃功能即将推出', icon: 'none', duration: 2000 })
  },

  // State B
  onSelectTechnique(e) {
    this.setData({ brewTechnique: e.currentTarget.dataset.technique })
  },

  onTapTemp() {
    const idx = this.data.tempValues.indexOf(this.data.waterTemp)
    this.setData({
      tempPickerVisible: true,
      tempPickerIndex: [idx >= 0 ? idx : 13],
    })
  },

  onTempPickerChange(e) {
    this.setData({ tempPickerIndex: e.detail.value })
  },

  onTempPickerConfirm() {
    const waterTemp = this.data.tempValues[this.data.tempPickerIndex[0]]
    this.setData({ waterTemp, tempPickerVisible: false })
  },

  onTempPickerCancel() {
    this.setData({ tempPickerVisible: false })
  },

  onTapFilterCup() {
    const filterCups = app.globalData.filterCups || []
    if (filterCups.length === 0) {
      wx.showToast({ title: '请先在设置中添加滤杯', icon: 'none' })
      return
    }
    const itemList = [...filterCups]
    wx.showActionSheet({
      itemList,
      success: (res) => {
        this.setData({ filterCup: itemList[res.tapIndex] })
      }
    })
  },

  async onStartBrew() {
    // Fetch recipe from cloud
    wx.showLoading({ title: '加载配方...' })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'getBrewRecipe', technique: this.data.brewTechnique }
      })
      
      if (!result || !result.success || !result.data) {
        throw new Error('未找到配方数据')
      }

      const recipe = result.data
      this.setData({
        state: 'C',
        steps: recipe.steps || [],
        totalTime: recipe.totalTime || 180,
        currentStepIndex: 0,
        currentStep: recipe.steps && recipe.steps.length > 0 ? recipe.steps[0] : null,
        elapsedTime: 0,
        timerRunning: true,
        timerDone: false,
        animateIn: false,
      })
      wx.hideLoading()
      setTimeout(() => this.setData({ animateIn: true }), 50)
      this._startTimer()
    } catch (err) {
      wx.hideLoading()
      console.error('Failed to load recipe:', err)
      wx.showToast({ title: app.getErrorMessage(err), icon: 'none', duration: 2500 })
    }
  },

  _startTimer() {
    if (this._timer) clearInterval(this._timer)
    this._timer = setInterval(() => {
      const elapsed = this.data.elapsedTime + 1
      if (elapsed >= this.data.totalTime) {
        clearInterval(this._timer)
        this._timer = null
        this.setData({ 
          elapsedTime: this.data.totalTime,
          timerRunning: false, 
          timerDone: true,
        })
        return
      }

      // Find current step
      const steps = this.data.steps
      let stepIdx = this.data.currentStepIndex
      while (stepIdx < steps.length - 1 && elapsed >= steps[stepIdx + 1].startTime) {
        stepIdx++
      }

      this.setData({
        elapsedTime: elapsed,
        currentStepIndex: stepIdx,
        currentStep: steps[stepIdx] || null,
      })
    }, 1000)
  },

  onFinishBrew() {
    this.setData({ state: 'D', animateIn: false })
    setTimeout(() => this.setData({ animateIn: true }), 50)
  },

  // State D - Feedback
  onTasteGood() {
    this.setData({ taste: 'good' })
    this._saveLog()
  },

  onTasteBad() {
    this.setData({ taste: 'bad', showBadReasons: true })
  },

  onToggleBadReason(e) {
    const reason = e.currentTarget.dataset.reason
    let badReasons = [...this.data.badReasons]
    const idx = badReasons.indexOf(reason)
    if (idx >= 0) {
      badReasons.splice(idx, 1)
    } else {
      badReasons.push(reason)
    }
    this.setData({ badReasons })
  },

  onCustomReasonInput(e) {
    this.setData({ customReason: e.detail.value })
  },

  onSubmitBadFeedback() {
    let badReasons = [...this.data.badReasons]
    const custom = this.data.customReason.trim()
    if (custom) {
      badReasons.push('other:' + custom)
    }
    if (badReasons.length === 0) {
      wx.showToast({ title: '请选择至少一个原因', icon: 'none' })
      return
    }
    this.setData({ badReasons })
    this._saveLog()
  },

  async _saveLog() {
    if (this.data.saving) return
    this.setData({ saving: true })

    const data = {
      brewMethod: 'pourover',
      brewTechnique: this.data.brewTechnique,
      filterCup: this.data.filterCup,
      waterTemp: this.data.waterTemp,
      taste: this.data.taste,
      badReasons: this.data.taste === 'bad' ? this.data.badReasons : [],
      beanName: '',  // Not required from brew flow
      brewTime: this.data.totalTime,
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'addLog', data }
      })
      if (!result || !result.success) {
        throw new Error((result && result.error) || '保存失败')
      }
      wx.showToast({ title: '已记录', icon: 'success' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 800)
    } catch (err) {
      console.error('Save brew log failed:', err)
      wx.showToast({ title: app.getErrorMessage(err), icon: 'none', duration: 2500 })
    }
    this.setData({ saving: false })
  },

  onGoBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) })
  },
})
