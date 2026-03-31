const app = getApp()

const GOOD_QUOTES = [
  '美好的一天从一杯好咖啡开始 ☕',
  '这杯咖啡值得被记住 ✨',
  '完美萃取，咖啡师本人 👏',
  '生活需要这样的小确幸 🌟',
  '味蕾的奖赏，继续保持 💫',
]

const BAD_QUOTES = [
  '每一次尝试都是进步的阶梯 💪',
  '好咖啡需要反复调试，再来一杯 🔄',
  '调整参数，下一杯会更好 ⚙️',
  '咖啡的乐趣在于探索 🧭',
  '失败是成功的咖啡渣 ☕',
]

Page({
  data: {
    state: 'A',

    // State B params
    waterTemp: 93,
    filterCup: '',
    filterCupList: [],
    showFilterCupInput: false,
    filterCupInputValue: '',
    brewTechnique: 'yidaoliu',
    techniqueLabels: { yidaoliu: '一刀流', sanduanshi: '三段式' },

    // State C timer
    timerRunning: false,
    timerPaused: false,
    elapsedTime: 0,
    totalTime: 0,
    steps: [],
    currentStepIndex: 0,
    currentStep: null,
    timerDone: false,

    // State D feedback
    taste: '',
    isBitterSelected: false,
    isSourSelected: false,
    otherSelected: false,
    customReason: '',
    saving: false,
    quote: '',

    // Temp picker
    tempPickerVisible: false,
    tempValues: [],
    tempPickerIndex: [0],

    animateIn: false,
  },

  async onLoad() {
    const tempValues = []
    for (let t = 80; t <= 100; t++) tempValues.push(t)
    const tempIdx = tempValues.indexOf(93)

    this.setData({
      tempValues,
      tempPickerIndex: [tempIdx >= 0 ? tempIdx : 13],
    })

    let filterCupList = app.globalData.filterCups || []
    if (filterCupList.length === 0) {
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'coffeeLogFunctions',
          data: { type: 'getEquipment' }
        })
        if (result && result.success && result.data) {
          filterCupList = result.data.filterCups || []
          app.globalData.filterCups = filterCupList
        }
      } catch (_) {}
    }

    this.setData({
      filterCupList,
      filterCup: filterCupList.length > 0 ? filterCupList[0] : '',
      showFilterCupInput: filterCupList.length === 0,
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

  // Filter cup
  onTapFilterCup() {
    const list = this.data.filterCupList
    if (list.length === 0) {
      this.setData({ showFilterCupInput: true })
      return
    }
    const itemList = [...list, '+ 添加新滤杯']
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === list.length) {
          this.setData({ showFilterCupInput: true, filterCupInputValue: '' })
        } else {
          this.setData({ filterCup: list[res.tapIndex], showFilterCupInput: false })
        }
      }
    })
  },

  onFilterCupInput(e) {
    this.setData({ filterCupInputValue: e.detail.value })
  },

  onConfirmFilterCup() {
    const value = this.data.filterCupInputValue.trim()
    if (!value) {
      wx.showToast({ title: '请输入滤杯型号', icon: 'none' })
      return
    }
    const list = [...this.data.filterCupList]
    if (!list.includes(value)) {
      list.push(value)
      app.globalData.filterCups = list
      wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'saveEquipment', grinders: app.globalData.grinders || [], filterCups: list }
      }).catch(() => {})
    }
    this.setData({
      filterCup: value,
      filterCupList: list,
      showFilterCupInput: false,
      filterCupInputValue: '',
    })
  },

  onCancelFilterCupInput() {
    this.setData({ showFilterCupInput: false, filterCupInputValue: '' })
  },

  // Start brew
  async onStartBrew() {
    wx.showLoading({ title: '加载配方...' })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'getBrewRecipe', technique: this.data.brewTechnique }
      })

      if (!result || !result.success || !result.data) {
        throw new Error((result && result.error) || '未找到配方数据')
      }

      const recipe = result.data
      const steps = recipe.steps || []
      this.setData({
        state: 'C',
        steps,
        totalTime: recipe.totalTime || 180,
        currentStepIndex: 0,
        currentStep: steps.length > 0 ? steps[0] : null,
        elapsedTime: 0,
        timerRunning: true,
        timerPaused: false,
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
      if (this.data.timerPaused) return

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

  // Pause / Resume / Stop
  onPauseTimer() {
    this.setData({ timerPaused: true })
  },

  onResumeTimer() {
    this.setData({ timerPaused: false })
  },

  onStopTimer() {
    wx.showModal({
      title: '终止冲煮',
      content: '确定要终止本次冲煮吗？',
      confirmColor: '#1C1C1E',
      success: (res) => {
        if (res.confirm) {
          if (this._timer) {
            clearInterval(this._timer)
            this._timer = null
          }
          this._goToFeedback()
        }
      }
    })
  },

  onFinishBrew() {
    this._goToFeedback()
  },

  _goToFeedback() {
    const quote = GOOD_QUOTES[Math.floor(Math.random() * GOOD_QUOTES.length)]
    this.setData({
      state: 'D',
      timerRunning: false,
      timerPaused: false,
      taste: '',
      isBitterSelected: false,
      isSourSelected: false,
      otherSelected: false,
      customReason: '',
      quote,
      animateIn: false,
    })
    setTimeout(() => this.setData({ animateIn: true }), 50)
  },

  // State D - Feedback
  onSelectTaste(e) {
    const taste = e.currentTarget.dataset.taste
    if (taste === 'good') {
      const quote = GOOD_QUOTES[Math.floor(Math.random() * GOOD_QUOTES.length)]
      this.setData({ taste: 'good', isBitterSelected: false, isSourSelected: false, otherSelected: false, customReason: '', quote })
    } else {
      const quote = BAD_QUOTES[Math.floor(Math.random() * BAD_QUOTES.length)]
      this.setData({ taste: 'bad', quote })
    }
  },

  onToggleBitter() {
    this.setData({ isBitterSelected: !this.data.isBitterSelected })
  },

  onToggleSour() {
    this.setData({ isSourSelected: !this.data.isSourSelected })
  },

  onToggleOther() {
    const otherSelected = !this.data.otherSelected
    this.setData({ otherSelected, customReason: otherSelected ? this.data.customReason : '' })
  },

  onCustomReasonInput(e) {
    this.setData({ customReason: e.detail.value })
  },

  _buildBadReasons() {
    const reasons = []
    if (this.data.isBitterSelected) reasons.push('too_bitter')
    if (this.data.isSourSelected) reasons.push('too_sour')
    const custom = this.data.customReason.trim()
    if (this.data.otherSelected && custom) {
      reasons.push('other:' + custom)
    }
    return reasons
  },

  onSubmitFeedback() {
    if (!this.data.taste || this.data.saving) return
    this._saveLog()
  },

  onSkipFeedback() {
    this.setData({ taste: '' })
    this._saveLog()
  },

  async _saveLog() {
    if (this.data.saving) return
    this.setData({ saving: true })

    const badReasons = this.data.taste === 'bad' ? this._buildBadReasons() : []

    const data = {
      brewMethod: 'pourover',
      brewTechnique: this.data.brewTechnique,
      filterCup: this.data.filterCup,
      waterTemp: this.data.waterTemp,
      taste: this.data.taste || '',
      badReasons,
      beanName: '',
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
