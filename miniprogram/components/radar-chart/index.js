Component({
  properties: {
    dims: { type: Array, value: [] },
    size: { type: Number, value: 180 },
  },

  data: {
    sizePx: 180,
  },

  observers: {
    'size': function (val) {
      this.setData({ sizePx: val })
    },
    'dims': function () {
      this._scheduleDraw()
    },
  },

  lifetimes: {
    ready() {
      this.setData({ sizePx: this.data.size })
      this._scheduleDraw()
    },
  },

  methods: {
    _scheduleDraw() {
      if (this._drawTimer) clearTimeout(this._drawTimer)
      this._drawTimer = setTimeout(() => this._initCanvas(), 100)
    },

    _initCanvas() {
      const query = this.createSelectorQuery()
      query.select('#radarCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const info = wx.getWindowInfo()
          const dpr = info.pixelRatio || 2
          const w = res[0].width
          const h = res[0].height
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)
          this._draw(ctx, w, h)
        })
    },

    _draw(ctx, w, h) {
      const dims = this.data.dims
      if (!dims || dims.length < 5) return

      const n = 5
      const maxScore = 5
      const levels = 5
      const cx = w / 2
      const cy = h / 2
      const labelPadding = 38
      const radius = Math.min(cx, cy) - labelPadding

      ctx.clearRect(0, 0, w, h)

      // Pentagon grid levels
      for (let l = 1; l <= levels; l++) {
        const r = radius * l / levels
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const angle = (Math.PI * 2 * i / n) - Math.PI / 2
          const x = cx + r * Math.cos(angle)
          const y = cy + r * Math.sin(angle)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        if (l === levels) {
          ctx.strokeStyle = '#D1D1D6'
          ctx.lineWidth = 0.8
        } else {
          ctx.strokeStyle = '#E5E5EA'
          ctx.lineWidth = 0.5
        }
        ctx.stroke()
      }

      // Axes from center to vertices
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
        ctx.strokeStyle = '#E5E5EA'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Data polygon — fill
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2
        const r = radius * ((dims[i].score || 0) / maxScore)
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(174, 174, 178, 0.18)'
      ctx.fill()
      ctx.strokeStyle = '#8E8E93'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Data dots
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2
        const r = radius * ((dims[i].score || 0) / maxScore)
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#636366'
        ctx.fill()
      }

      // Labels with scores
      const fontSize = 11
      ctx.font = `500 ${fontSize}px -apple-system, "PingFang SC", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2
        const labelR = radius + 22
        const x = cx + labelR * Math.cos(angle)
        const y = cy + labelR * Math.sin(angle)

        // Adjust vertical position based on which vertex
        let offsetY = 0
        if (i === 0) offsetY = -4        // top vertex — push labels up less
        else if (i === 1 || i === 4) offsetY = 0  // side vertices
        else offsetY = 4                  // bottom vertices — push labels down

        // Label name
        ctx.fillStyle = '#3A3A3C'
        ctx.fillText(dims[i].label, x, y + offsetY - 6)

        // Score value
        ctx.fillStyle = '#8E8E93'
        ctx.font = `400 ${fontSize - 1}px -apple-system, "PingFang SC", sans-serif`
        ctx.fillText(String(dims[i].score || 0), x, y + offsetY + 7)
        ctx.font = `500 ${fontSize}px -apple-system, "PingFang SC", sans-serif`
      }
    },
  },
})
