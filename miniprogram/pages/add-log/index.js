const app = getApp()

const PARAM_CONFIGS = {
  grindSize:   { label: '研磨度',   unit: '格', min: 0,   max: 50,  step: 0.5, default: 20 },
  coffeeDose:  { label: '粉量',     unit: 'g',  min: 0,   max: 50,  step: 0.5, default: 15 },
  waterAmount: { label: '水量',     unit: 'ml', min: 0,   max: 500, step: 5,   default: 225 },
  waterTemp:   { label: '水温',     unit: '°C', min: 0,   max: 100, step: 0.5, default: 93 },
  brewTime:    { label: '萃取时间', unit: '秒', min: 0,   max: 600, step: 1,   default: 180 },
  ambientTemp: { label: '气温',     unit: '°C', min: -10, max: 50,  step: 1,   default: 25 },
  humidity:    { label: '湿度',     unit: '%',  min: 0,   max: 100, step: 1,   default: 60 },
}

const PARAM_FIELDS = ['grindSize', 'coffeeDose', 'waterAmount', 'waterTemp', 'brewTime', 'ambientTemp', 'humidity']

function generateRange(min, max, step) {
  const arr = []
  for (let v = min; v <= max + 0.001; v += step) {
    arr.push(+v.toFixed(1))
  }
  return arr
}

function valueToIndex(field, value) {
  const c = PARAM_CONFIGS[field]
  const v = (value != null) ? value : c.default
  return Math.round((v - c.min) / c.step)
}

function indexToValue(field, index) {
  const c = PARAM_CONFIGS[field]
  return +(c.min + index * c.step).toFixed(1)
}

Page({
  data: {
    beanName: '',
    origin: '',
    roastLevels: ['浅烘', '中浅', '中度', '中深', '深烘'],
    roastValues: ['light', 'medium_light', 'medium', 'medium_dark', 'dark'],
    roastColors: ['#D4A574', '#B8864E', '#8B6333', '#5C3D1E', '#2D1810'],
    roastIndex: -1,

    brewMethod: '',
    brewMethods: [
      { value: 'pourover', label: '手冲', icon: '☕' },
      { value: 'espresso', label: '意式', icon: '🫗' },
      { value: 'coldbrew', label: '冷萃', icon: '🧊' },
    ],

    grinderModel: '',
    grindSize: null,
    coffeeDose: null,
    waterAmount: null,
    waterTemp: null,
    brewTime: null,
    ambientTemp: null,
    humidity: null,
    remarks: '',

    ratings: [
      { dim: 'aroma', label: '香气', score: 0 },
      { dim: 'acidity', label: '酸质', score: 0 },
      { dim: 'sweetness', label: '甜度', score: 0 },
      { dim: 'body', label: '醇厚度', score: 0 },
      { dim: 'aftertaste', label: '余韵', score: 0 },
      { dim: 'overall', label: '综合', score: 0 },
    ],

    notes: '',
    submitting: false,
    isEdit: false,
    editId: '',

    // Picker state
    pickerVisible: false,
    pickerLabel: '',
    pickerUnit: '',
    pickerValues: [],
    pickerIndex: [0],
    pickerField: '',
  },

  onLoad(options) {
    // Pre-generate ranges
    this._ranges = {}
    PARAM_FIELDS.forEach(f => {
      this._ranges[f] = generateRange(PARAM_CONFIGS[f].min, PARAM_CONFIGS[f].max, PARAM_CONFIGS[f].step)
    })

    if (options.id) {
      // Editing requires login
      if (!app.globalData.isLoggedIn) {
        app.requireLogin()
        setTimeout(() => wx.navigateBack(), 100)
        return
      }
      this.setData({ isEdit: true, editId: options.id })
      wx.setNavigationBarTitle({ title: '编辑记录' })
      this.loadLog(options.id)
    } else {
      this._applyDefaults()
    }
  },

  _applyDefaults() {
    const last = wx.getStorageSync('lastBrewParams') || {}
    const updates = {}
    PARAM_FIELDS.forEach(f => {
      updates[f] = (last[f] != null) ? last[f] : PARAM_CONFIGS[f].default
    })
    if (last.grinderModel) updates.grinderModel = last.grinderModel
    this.setData(updates)
  },

  _saveLastParams() {
    const params = { grinderModel: this.data.grinderModel }
    PARAM_FIELDS.forEach(f => { params[f] = this.data[f] })
    try {
      wx.setStorageSync('lastBrewParams', params)
    } catch (e) { /* ignore storage errors */ }
  },

  async loadLog(id) {
    wx.showLoading({ title: '加载中' })
    try {
      if (!(await app.checkConnectivity())) {
        wx.hideLoading()
        wx.showModal({
          title: '网络异常',
          content: '无法连接服务器，请检查网络后重试',
          showCancel: false,
          success: () => wx.navigateBack(),
        })
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
      if (!log) throw new Error('记录不存在或已被删除')

      const roastIndex = this.data.roastValues.indexOf(log.roastLevel)
      const ratings = this.data.ratings.map(r => ({ ...r, score: log[r.dim] || 0 }))
      this.setData({
        beanName: log.beanName || '',
        origin: log.origin || '',
        roastLevel: log.roastLevel || '',
        roastIndex,
        brewMethod: log.brewMethod || '',
        grinderModel: log.grinderModel || '',
        grindSize: log.grindSize != null ? log.grindSize : null,
        coffeeDose: log.coffeeDose != null ? log.coffeeDose : null,
        waterAmount: log.waterAmount != null ? log.waterAmount : null,
        waterTemp: log.waterTemp != null ? log.waterTemp : null,
        brewTime: log.brewTime != null ? log.brewTime : null,
        ambientTemp: log.ambientTemp != null ? log.ambientTemp : null,
        humidity: log.humidity != null ? log.humidity : null,
        remarks: log.remarks || '',
        ratings,
        notes: log.notes || '',
      })
    } catch (err) {
      console.error('Load log failed:', err)
      wx.showToast({ title: app.getErrorMessage(err), icon: 'none', duration: 2500 })
    }
    wx.hideLoading()
  },

  // --- Text inputs ---
  onInputBeanName(e) { this.setData({ beanName: e.detail.value }) },
  onInputGrinderModel(e) { this.setData({ grinderModel: e.detail.value }) },
  onInputRemarks(e) { this.setData({ remarks: e.detail.value }) },
  onInputNotes(e) { this.setData({ notes: e.detail.value }) },
  onPickRoast(e) {
    const idx = Number(e.currentTarget.dataset.level)
    if (idx === this.data.roastIndex) {
      this.setData({ roastIndex: -1, roastLevel: '' })
    } else {
      this.setData({ roastIndex: idx, roastLevel: this.data.roastValues[idx] })
    }
  },
  onSelectMethod(e) { this.setData({ brewMethod: e.currentTarget.dataset.value }) },

  // --- Star ratings ---
  onTapStar(e) {
    const { index, star } = e.currentTarget.dataset
    this.setData({ [`ratings[${index}].score`]: star })
  },

  // --- Scroll wheel picker ---
  onTapParam(e) {
    const field = e.currentTarget.dataset.field
    const config = PARAM_CONFIGS[field]
    if (!config) return
    const values = this._ranges[field]
    const idx = valueToIndex(field, this.data[field])
    this.setData({
      pickerVisible: true,
      pickerLabel: config.label,
      pickerUnit: config.unit,
      pickerValues: values,
      pickerIndex: [Math.min(idx, values.length - 1)],
      pickerField: field,
    })
  },

  onPickerChange(e) {
    this.setData({ pickerIndex: e.detail.value })
  },

  onPickerConfirm() {
    const field = this.data.pickerField
    const value = this.data.pickerValues[this.data.pickerIndex[0]]
    this.setData({ [field]: value, pickerVisible: false })
  },

  onPickerCancel() {
    this.setData({ pickerVisible: false })
  },

  // --- Validation ---
  validate() {
    if (!this.data.beanName.trim()) {
      wx.showToast({ title: '请输入豆子名称', icon: 'none' }); return false
    }
    if (!this.data.brewMethod) {
      wx.showToast({ title: '请选择冲煮方式', icon: 'none' }); return false
    }
    return true
  },

  // --- Submit ---
  async onSubmit() {
    if (!this.validate() || this.data.submitting) return
    if (!app.globalData.isLoggedIn) {
      app.requireLogin()
      return
    }
    if (!(await app.checkConnectivity())) return
    this.setData({ submitting: true })

    const ratingData = {}
    this.data.ratings.forEach(r => { ratingData[r.dim] = r.score })

    const data = {
      beanName: this.data.beanName.trim(),
      roastLevel: this.data.roastLevel,
      brewMethod: this.data.brewMethod,
      grinderModel: this.data.grinderModel.trim(),
      grindSize: this.data.grindSize,
      coffeeDose: this.data.coffeeDose,
      waterAmount: this.data.waterAmount,
      waterTemp: this.data.waterTemp,
      brewTime: this.data.brewTime,
      ambientTemp: this.data.ambientTemp,
      humidity: this.data.humidity,
      remarks: this.data.remarks.trim(),
      ...ratingData,
      notes: this.data.notes.trim(),
    }

    try {
      let result
      if (this.data.isEdit) {
        const res = await wx.cloud.callFunction({
          name: 'coffeeLogFunctions',
          data: { type: 'updateLog', id: this.data.editId, data }
        })
        result = res.result
      } else {
        const res = await wx.cloud.callFunction({
          name: 'coffeeLogFunctions',
          data: { type: 'addLog', data }
        })
        result = res.result
      }
      if (!result || !result.success) {
        throw new Error((result && result.error) || '保存失败')
      }
      this._saveLastParams()
      wx.showToast({ title: this.data.isEdit ? '已更新' : '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (err) {
      console.error('Save failed:', err)
      wx.showToast({ title: app.getErrorMessage(err), icon: 'none', duration: 2500 })
    }
    this.setData({ submitting: false })
  },
})
