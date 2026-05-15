const api = require('../../utils/api')

Page({
  data: {
    nickname: ''
  },

  onInputNickname(e) {
    this.setData({ nickname: e.detail.value })
  },

  async onConfirm() {
    const nickname = this.data.nickname.trim()
    try {
      const id = getApp().globalData.whitelistId
      if (id) {
        await api.updateWhitelist(id, nickname, null)
      }
    } catch (err) {
      // 非阻塞
    }
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  onSkip() {
    wx.switchTab({ url: '/pages/menu/menu' })
  }
})
