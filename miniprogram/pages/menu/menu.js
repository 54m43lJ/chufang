const api = require('../../utils/api')

Page({
  data: {
    categories: [],
    loading: true,
    cartCount: 0,
    showCart: false,
    cartItems: [],
    submitting: false
  },

  onShow() {
    if (!getApp().checkAccess()) return
    this.loadMenu()
    this.updateCartBadge()
  },

  onPullDownRefresh() {
    this.loadMenu().then(() => wx.stopPullDownRefresh())
  },

  /* ====== 菜品列表 ====== */

  async loadMenu() {
    this.setData({ loading: true })
    try {
      const res = await api.listMenu()
      const items = res.items

      // 批量获取缩略图
      const thumbTasks = items
        .filter(item => item.thumbnail && item.images && item.images.length > 0)
        .map(async (item) => {
          try {
            const urls = await getApp().getImageUrls(item._id, [item.thumbnail])
            item.thumbUrl = urls[item.thumbnail] || ''
          } catch (e) { item.thumbUrl = '' }
        })
      await Promise.all(thumbTasks)

      const grouped = {}
      items.forEach(item => {
        const cat = item.category || '其他'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(item)
      })
      const categories = Object.keys(grouped).map(name => ({
        name,
        items: grouped[name]
      }))
      this.setData({ categories, loading: false })
    } catch (err) {
      console.error('load menu failed:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onQuickAdd(e) {
    const { id, name: dishName } = e.currentTarget.dataset
    const app = getApp()
    app.addToCart({ _id: id, name: dishName }, 1)
    this.updateCartBadge()
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1000 })
  },

  /* ====== 购物车浮层 ====== */

  updateCartBadge() {
    const app = getApp()
    const count = app.getCartCount()
    this.setData({ cartCount: count })
  },

  onOpenCart() {
    const app = getApp()
    app.loadCart()
    this.setData({ cartItems: app.globalData.cart, showCart: true })
  },

  onCloseCart() {
    this.setData({ showCart: false })
  },

  onClearCart() {
    wx.showModal({
      title: '清空购物车',
      content: '确定清空购物车中所有菜品？',
      success: (res) => {
        if (res.confirm) {
          getApp().clearCart()
          this._refreshCart()
        }
      }
    })
  },

  noop() {},

  onCartMinus(e) {
    const menuId = e.currentTarget.dataset.id
    const app = getApp()
    const item = app.globalData.cart.find(c => c.menuId === menuId)
    if (item) {
      app.updateCartQuantity(menuId, item.quantity - 1)
      this._refreshCart()
    }
  },

  onCartPlus(e) {
    const menuId = e.currentTarget.dataset.id
    const app = getApp()
    const item = app.globalData.cart.find(c => c.menuId === menuId)
    if (item) {
      app.updateCartQuantity(menuId, item.quantity + 1)
      this._refreshCart()
    }
  },

  onCartDelete(e) {
    const menuId = e.currentTarget.dataset.id
    wx.showModal({
      title: '移除菜品',
      content: '确定从购物车移除此菜品？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.removeFromCart(menuId)
          this._refreshCart()
        }
      }
    })
  },

  async onSubmitOrder() {
    if (this.data.cartItems.length === 0) return
    this.setData({ submitting: true })
    try {
      await api.createOrder(this.data.cartItems)
      const app = getApp()
      app.clearCart()
      this.setData({ showCart: false, submitting: false })
      this.updateCartBadge()
      wx.showToast({ title: '下单成功', icon: 'success', duration: 1500 })
      setTimeout(() => wx.switchTab({ url: '/pages/orders/orders' }), 1500)
    } catch (err) {
      console.error('submit order failed:', err)
      this.setData({ submitting: false })
      wx.showToast({ title: '下单失败', icon: 'none' })
    }
  },

  _refreshCart() {
    const app = getApp()
    app.loadCart()
    this.setData({ cartItems: app.globalData.cart })
    this.updateCartBadge()
  }
})
