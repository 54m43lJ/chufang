const api = require('../../utils/api')

Page({
  data: {
    dish: null,
    images: [],
    quantity: 1,
    loading: true
  },

  onLoad(options) {
    if (!getApp().checkAccess()) {
      wx.navigateBack()
      return
    }
    if (options.id) {
      this.loadDish(options.id)
    }
  },

  async loadDish(id) {
    try {
      const res = await api.getMenu(id)
      const dish = res.item
      let images = []

      const uids = dish.images || []
      if (uids.length > 0) {
        try {
          const urlsMap = await getApp().getImageUrls(id, uids)
          images = uids.map(uid => urlsMap[uid] || '')
        } catch (e) { /* 加载失败忽略 */ }
      }

      this.setData({ dish, images, loading: false })
    } catch (err) {
      console.error('load dish failed:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onMinus() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 })
    }
  },

  onPlus() {
    this.setData({ quantity: this.data.quantity + 1 })
  },

  onAddToCart() {
    const app = getApp()
    app.addToCart(this.data.dish, this.data.quantity)
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1200 })
    setTimeout(() => wx.navigateBack(), 1200)
  }
})
