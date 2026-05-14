App({
  globalData: {
    openid: '',
    role: '',
    allowed: false,
    authChecked: false,
    cart: [],
    cartVersion: 0
  },

  onLaunch(options) {
    wx.cloud.init({
      env: 'cloud1-0g2b8j7f3e8b5c6d' // 替换为你的云环境 ID
    })

    const token = (options && options.query && options.query.token) || ''
    if (token) {
      this.claimInvitation(token)
    } else {
      this.checkAuth()
    }
  },

  async claimInvitation(token) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'invitation',
        data: { action: 'claim', data: { token } }
      })
      if (res.result.ok) {
        wx.showToast({ title: '欢迎使用', icon: 'success', duration: 2000 })
      }
    } catch (e) {}
    this.checkAuth()
  },

  async checkAuth() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'auth',
        data: { action: 'check' }
      })
      const { allowed, openid, role } = res.result
      this.globalData.openid = openid
      this.globalData.allowed = allowed
      this.globalData.role = role || ''
      this.globalData.authChecked = true
    } catch (err) {
      console.error('auth check failed:', err)
      this.globalData.authChecked = true
      this.globalData.allowed = false
    }
  },

  loadCart() {
    try {
      const raw = wx.getStorageSync('cart')
      if (raw) {
        this.globalData.cart = JSON.parse(raw)
      }
    } catch (e) {
      this.globalData.cart = []
    }
  },

  saveCart() {
    this.globalData.cartVersion++
    wx.setStorageSync('cart', JSON.stringify(this.globalData.cart))
  },

  addToCart(menuItem, quantity) {
    this.loadCart()
    const cart = this.globalData.cart
    const idx = cart.findIndex(item => item.menuId === menuItem._id)
    if (idx >= 0) {
      cart[idx].quantity += quantity
    } else {
      cart.push({
        menuId: menuItem._id,
        name: menuItem.name,
        quantity
      })
    }
    this.saveCart()
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  },

  removeFromCart(menuId) {
    this.loadCart()
    this.globalData.cart = this.globalData.cart.filter(item => item.menuId !== menuId)
    this.saveCart()
  },

  updateCartQuantity(menuId, quantity) {
    this.loadCart()
    const cart = this.globalData.cart
    const idx = cart.findIndex(item => item.menuId === menuId)
    if (idx >= 0) {
      if (quantity <= 0) {
        cart.splice(idx, 1)
      } else {
        cart[idx].quantity = quantity
      }
    }
    this.saveCart()
  },

  clearCart() {
    this.globalData.cart = []
    this.saveCart()
  },

  getCartCount() {
    this.loadCart()
    return this.globalData.cart.reduce((sum, item) => sum + item.quantity, 0)
  },

  // 返回 true 表示通过，false 表示无权限或尚未完成检查
  checkAccess() {
    if (!this.globalData.authChecked) return false
    if (!this.globalData.allowed) {
      wx.redirectTo({
        url: `/pages/unauthorized/unauthorized?openid=${encodeURIComponent(this.globalData.openid)}`
      })
      return false
    }
    return true
  },

  mergeToCart(items) {
    this.loadCart()
    const cart = this.globalData.cart
    items.forEach(item => {
      const idx = cart.findIndex(c => c.menuId === item.menuId)
      if (idx >= 0) {
        cart[idx].quantity += item.quantity
      } else {
        cart.push({
          menuId: item.menuId,
          name: item.name,
          quantity: item.quantity
        })
      }
    })
    this.saveCart()
  },

  /* ====== 图片 API ====== */

  async updateImages(menuId, deleteUids, newFilePaths) {
    // 将本地路径逐个上传到云存储，获得 fileID 数组
    const fileIDs = await Promise.all(
      newFilePaths.map(p =>
        wx.cloud.uploadFile({
          cloudPath: `temp/${menuId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          filePath: p
        }).then(r => r.fileID)
      )
    )
    return wx.cloud.callFunction({
      name: 'image',
      data: { action: 'update', data: { menuId, delete: deleteUids, upload: fileIDs } }
    }).then(res => res.result)
  },

  getImageUrls(menuId, uids) {
    return wx.cloud.callFunction({
      name: 'image',
      data: { action: 'getUrls', data: { menuId, uids } }
    }).then(res => res.result.urls)
  }
})
