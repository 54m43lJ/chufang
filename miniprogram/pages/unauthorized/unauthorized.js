Page({
  data: {
    openid: '',
    maskedOpenid: '',
    revealed: false,
    copied: false
  },

  onLoad(options) {
    const openid = options.openid || ''
    this.setData({
      openid,
      maskedOpenid: this.maskOpenid(openid)
    })
  },

  maskOpenid(openid) {
    if (!openid || openid.length <= 8) return openid
    return openid.slice(0, 4) + '****' + openid.slice(-4)
  },

  onToggleReveal() {
    this.setData({ revealed: !this.data.revealed })
  },

  onCopy() {
    wx.setClipboardData({
      data: this.data.openid,
      success: () => {
        this.setData({ copied: true })
        wx.showToast({ title: '已复制', icon: 'success', duration: 1500 })
        setTimeout(() => this.setData({ copied: false }), 2000)
      }
    })
  }
})
