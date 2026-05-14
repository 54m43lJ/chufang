const api = require('../../utils/api')

Page({
  data: {
    cartItems: [],
    submitting: false
  },

  onShow() {
    if (!getApp().checkAccess()) return
    this.loadCart()
  },

  loadCart() {
    const app = getApp()
    app.loadCart()
    this.setData({ cartItems: app.globalData.cart })
  },

  onMinus(e) {
    const menuId = e.currentTarget.dataset.id
    const app = getApp()
    const item = app.globalData.cart.find(c => c.menuId === menuId)
    if (item) {
      app.updateCartQuantity(menuId, item.quantity - 1)
      this.loadCart()
    }
  },

  onPlus(e) {
    const menuId = e.currentTarget.dataset.id
    const app = getApp()
    const item = app.globalData.cart.find(c => c.menuId === menuId)
    if (item) {
      app.updateCartQuantity(menuId, item.quantity + 1)
      this.loadCart()
    }
  },

  onDelete(e) {
    const menuId = e.currentTarget.dataset.id
    wx.showModal({
      title: '移除菜品',
      content: '确定从购物车移除此菜品？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.removeFromCart(menuId)
          this.loadCart()
        }
      }
    })
  },

  async onSubmit() {
    if (this.data.cartItems.length === 0) return

    this.setData({ submitting: true })
    try {
      await api.createOrder(this.data.cartItems)
      const app = getApp()
      app.clearCart()
      this.loadCart()
      wx.showToast({ title: '下单成功', icon: 'success', duration: 1500 })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/orders/orders' })
      }, 1500)
    } catch (err) {
      console.error('submit order failed:', err)
      wx.showToast({ title: '下单失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onGoMenu() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
