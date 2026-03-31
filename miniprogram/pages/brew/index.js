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
    grinderModel: '',
    grinderList: [],
    showGrinderInput: false,
    grinderInputValue: '',
    beanName: '',
    beanList: [],
    showBeanInput: false,
    beanInputValue: '',
    grindSize: 20,
    grindSizeValues: [],
    grindSizePickerVisible: false,
    grindSizePickerIndex: [0],
    brewTechnique: 'yidaoliu',
    techniqueLabels: { yidaoliu: '一刀流', sanduanshi: '三段式' },
    recipeNames: [],
    selectedRecipe: '',
    loadingRecipes: false,

    // State C timer
    timerRunning: false,
    timerPaused: false,
    elapsedTime: 0,
    totalTime: 0,
    steps: [],
    currentStepIndex: 0,
    currentStep: null,
    timerDone: false,
    currentWater: 0,
    stepTargetWater: 0,

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
    capsuleBottom: 0,
    navBarTop: 0,
    navBarHeight: 0,
  },

  async onLoad() {
    // Get capsule button position for safe area
    const menuBtn = wx.getMenuButtonBoundingClientRect()
    const capsuleBottom = menuBtn.top + menuBtn.height

    const tempValues = []
    for (let t = 80; t <= 100; t++) tempValues.push(t)
    const tempIdx = tempValues.indexOf(93)

    const grindSizeValues = []
    for (let g = 1; g <= 60; g++) grindSizeValues.push(g)

    const lastParams = wx.getStorageSync('lastBrewParams') || {}
    const defaultGrind = lastParams.grindSize || 20
    const grindIdx = grindSizeValues.indexOf(defaultGrind)

    this.setData({
      capsuleBottom,
      navBarTop: menuBtn.top,
      navBarHeight: menuBtn.height,
      tempValues,
      tempPickerIndex: [tempIdx >= 0 ? tempIdx : 13],
      grindSizeValues,
      grindSize: defaultGrind,
      grindSizePickerIndex: [grindIdx >= 0 ? grindIdx : 19],
    })

    // Load equipment (filter cups + grinders + beans)
    let filterCupList = app.globalData.filterCups || []
    let grinderList = app.globalData.grinders || []
    let beanList = app.globalData.beans || []
    if (filterCupList.length === 0 || grinderList.length === 0 || beanList.length === 0) {
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'coffeeLogFunctions',
          data: { type: 'getEquipment' }
        })
        if (result && result.success && result.data) {
          if (filterCupList.length === 0) {
            filterCupList = result.data.filterCups || []
            app.globalData.filterCups = filterCupList
          }
          if (grinderList.length === 0) {
            grinderList = result.data.grinders || []
            app.globalData.grinders = grinderList
          }
          if (beanList.length === 0) {
            beanList = result.data.beans || []
            app.globalData.beans = beanList
          }
        }
      } catch (_) {}
    }

    // Grinder default: last used > first in list > empty
    const lastGrinder = lastParams.grinderModel || ''
    let defaultGrinder = ''
    if (lastGrinder && grinderList.includes(lastGrinder)) {
      defaultGrinder = lastGrinder
    } else if (grinderList.length > 0) {
      defaultGrinder = grinderList[0]
    }

    // Bean default: last used > empty
    const lastBean = lastParams.beanName || ''

    // FilterCup default: last used > first in list > empty
    const lastFilterCup = lastParams.filterCup || ''
    let defaultFilterCup = ''
    if (lastFilterCup && filterCupList.includes(lastFilterCup)) {
      defaultFilterCup = lastFilterCup
    } else if (filterCupList.length > 0) {
      defaultFilterCup = filterCupList[0]
    }

    this.setData({
      filterCupList,
      filterCup: defaultFilterCup,
      showFilterCupInput: filterCupList.length === 0,
      grinderList,
      grinderModel: defaultGrinder,
      showGrinderInput: grinderList.length === 0,
      beanList,
      beanName: lastBean,
      showBeanInput: beanList.length === 0 && !lastBean,
    })

    // Load recipe names for default technique
    this._loadRecipeNames(this.data.brewTechnique)

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
    const technique = e.currentTarget.dataset.technique
    if (technique === this.data.brewTechnique) return
    this.setData({ brewTechnique: technique, selectedRecipe: '', recipeNames: [] })
    this._loadRecipeNames(technique)
  },

  async _loadRecipeNames(technique) {
    this.setData({ loadingRecipes: true })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'getRecipeNames', technique }
      })
      if (result && result.success) {
        const names = result.data || []
        this.setData({
          recipeNames: names,
          selectedRecipe: names.length > 0 ? names[0] : '',
          loadingRecipes: false,
        })
      } else {
        this.setData({ recipeNames: [], selectedRecipe: '', loadingRecipes: false })
      }
    } catch (_) {
      this.setData({ recipeNames: [], selectedRecipe: '', loadingRecipes: false })
    }
  },

  onSelectRecipe(e) {
    this.setData({ selectedRecipe: e.currentTarget.dataset.name })
  },

  // Technique swipe support
  onTechTouchStart(e) {
    this._techStartX = e.touches[0].clientX
  },

  onTechTouchEnd(e) {
    const endX = e.changedTouches[0].clientX
    const diff = endX - (this._techStartX || 0)
    if (Math.abs(diff) < 30) return
    const newTech = diff < 0 ? 'sanduanshi' : 'yidaoliu'
    if (newTech !== this.data.brewTechnique) {
      this.setData({ brewTechnique: newTech, selectedRecipe: '', recipeNames: [] })
      this._loadRecipeNames(newTech)
    }
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
    const itemList = [...list, '+ 添加新滤杯', '⚙ 管理设备']
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === list.length + 1) {
          wx.navigateTo({ url: '/pages/equipment/index' })
        } else if (res.tapIndex === list.length) {
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
        data: { type: 'saveEquipment', grinders: app.globalData.grinders || [], filterCups: list, beans: app.globalData.beans || [] }
      }).catch(() => {})
      app.syncEquipmentToCache()
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

  // Grinder model
  onTapGrinder() {
    const list = this.data.grinderList
    if (list.length === 0) {
      this.setData({ showGrinderInput: true })
      return
    }
    const itemList = [...list, '+ 添加新磨豆机', '⚙ 管理设备']
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === list.length + 1) {
          wx.navigateTo({ url: '/pages/equipment/index' })
        } else if (res.tapIndex === list.length) {
          this.setData({ showGrinderInput: true, grinderInputValue: '' })
        } else {
          this.setData({ grinderModel: list[res.tapIndex], showGrinderInput: false })
        }
      }
    })
  },

  onGrinderInput(e) {
    this.setData({ grinderInputValue: e.detail.value })
  },

  onConfirmGrinder() {
    const value = this.data.grinderInputValue.trim()
    if (!value) {
      wx.showToast({ title: '请输入磨豆机型号', icon: 'none' })
      return
    }
    const list = [...this.data.grinderList]
    if (!list.includes(value)) {
      list.push(value)
      app.globalData.grinders = list
      wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'saveEquipment', grinders: list, filterCups: app.globalData.filterCups || [], beans: app.globalData.beans || [] }
      }).catch(() => {})
      app.syncEquipmentToCache()
    }
    this.setData({
      grinderModel: value,
      grinderList: list,
      showGrinderInput: false,
      grinderInputValue: '',
    })
  },

  onCancelGrinderInput() {
    this.setData({ showGrinderInput: false, grinderInputValue: '' })
  },

  // Grind size picker
  onTapGrindSize() {
    const idx = this.data.grindSizeValues.indexOf(this.data.grindSize)
    this.setData({
      grindSizePickerVisible: true,
      grindSizePickerIndex: [idx >= 0 ? idx : 19],
    })
  },

  onGrindSizePickerChange(e) {
    this.setData({ grindSizePickerIndex: e.detail.value })
  },

  onGrindSizePickerConfirm() {
    const grindSize = this.data.grindSizeValues[this.data.grindSizePickerIndex[0]]
    this.setData({ grindSize, grindSizePickerVisible: false })
  },

  onGrindSizePickerCancel() {
    this.setData({ grindSizePickerVisible: false })
  },

  // Bean name
  onTapBean() {
    const list = this.data.beanList
    if (list.length === 0) {
      this.setData({ showBeanInput: true })
      return
    }
    const itemList = [...list, '+ 添加新咖啡豆', '⚙ 管理设备']
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === list.length + 1) {
          wx.navigateTo({ url: '/pages/equipment/index' })
        } else if (res.tapIndex === list.length) {
          this.setData({ showBeanInput: true, beanInputValue: '' })
        } else {
          this.setData({ beanName: list[res.tapIndex], showBeanInput: false })
        }
      }
    })
  },

  onBeanInput(e) {
    this.setData({ beanInputValue: e.detail.value })
  },

  onConfirmBean() {
    const value = this.data.beanInputValue.trim()
    if (!value) {
      wx.showToast({ title: '请输入咖啡豆名称', icon: 'none' })
      return
    }
    const list = [...this.data.beanList]
    if (!list.includes(value)) {
      list.push(value)
      app.globalData.beans = list
      wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: { type: 'saveEquipment', grinders: app.globalData.grinders || [], filterCups: app.globalData.filterCups || [], beans: list }
      }).catch(() => {})
      app.syncEquipmentToCache()
    }
    this.setData({
      beanName: value,
      beanList: list,
      showBeanInput: false,
      beanInputValue: '',
    })
  },

  onCancelBeanInput() {
    this.setData({ showBeanInput: false, beanInputValue: '' })
  },

  // Start brew
  async onStartBrew() {
    wx.showLoading({ title: '加载配方...' })
    try {
      const reqData = { type: 'getBrewRecipe', technique: this.data.brewTechnique }
      if (this.data.selectedRecipe) {
        reqData.recipeName = this.data.selectedRecipe
      }
      const { result } = await wx.cloud.callFunction({
        name: 'coffeeLogFunctions',
        data: reqData,
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
          currentWater: this._calcWater(this.data.totalTime),
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
        currentWater: this._calcWater(elapsed),
        stepTargetWater: this._calcStepTargetWater(stepIdx),
      })
    }, 1000)
  },

  /**
   * Calculate cumulative water at a given time.
   * Pour steps have waterAmount — water increases linearly during the pour interval.
   * Wait steps — water stays constant.
   */
  _calcWater(elapsed) {
    const steps = this.data.steps
    if (!steps || steps.length === 0) return 0
    let water = 0
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const stepStart = step.startTime || 0
      const stepEnd = (i < steps.length - 1) ? steps[i + 1].startTime : this.data.totalTime
      const stepWater = step.waterAmount || 0
      if (!stepWater || stepWater <= 0) {
        // Wait step or no water — skip
        if (elapsed < stepStart) break
        continue
      }
      // Pour step with water
      if (elapsed <= stepStart) break
      if (elapsed >= stepEnd) {
        water += stepWater
      } else {
        // Mid-pour: linearly interpolate
        const duration = stepEnd - stepStart
        const progress = (elapsed - stepStart) / (duration || 1)
        water += Math.round(stepWater * progress)
        break
      }
    }
    return Math.round(water)
  },

  /** Cumulative water target at end of current step (if pouring) or 0 */
  _calcStepTargetWater(stepIdx) {
    const steps = this.data.steps
    if (!steps || stepIdx < 0 || stepIdx >= steps.length) return 0
    const step = steps[stepIdx]
    if (!step.waterAmount || step.waterAmount <= 0) return 0
    // Sum all water up to and including this step
    let total = 0
    for (let i = 0; i <= stepIdx; i++) {
      total += steps[i].waterAmount || 0
    }
    return Math.round(total)
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
      grinderModel: this.data.grinderModel,
      grindSize: this.data.grindSize,
      waterTemp: this.data.waterTemp,
      taste: this.data.taste || '',
      badReasons,
      beanName: this.data.beanName || '',
      brewTime: this.data.totalTime,
    }

    // Cache last used params
    try {
      wx.setStorageSync('lastBrewParams', {
        grinderModel: this.data.grinderModel,
        grindSize: this.data.grindSize,
        beanName: this.data.beanName,
        filterCup: this.data.filterCup,
      })
    } catch (_) {}

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
