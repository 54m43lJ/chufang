Page({
  onShow() {
    const app = getApp()
    if (app.globalData.authChecked) {
      this.redirect()
    }
  },

  redirect() {
    const app = getApp()
    if (app.globalData.allowed) {
      wx.switchTab({ url: '/pages/menu/menu' })
    } else {
      wx.redirectTo({
        url: `/pages/unauthorized/unauthorized?openid=${encodeURIComponent(app.globalData.openid)}`
      })
    }
  }
})
