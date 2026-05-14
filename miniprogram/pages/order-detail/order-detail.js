const api = require('../../utils/api')

Page({
  data: {
    order: null,
    enrichedItems: [],
    loading: true
  },

  onLoad(options) {
    if (!getApp().checkAccess()) {
      wx.navigateBack()
      return
    }
    if (options.id) this.loadOrder(options.id)
  },

  async loadOrder(id) {
    this.setData({ loading: true })
    try {
      const res = await api.getOrder(id)
      const order = res.item
      const enriched = await this.enrichItems(order.items)
      this.setData({ order, enrichedItems: enriched, loading: false })
    } catch (err) {
      console.error('load order failed:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async enrichItems(items) {
    // 并行查询所有菜单项
    const results = await Promise.all(
      items.map(item =>
        api.getMenu(item.menuId).then(r => r.item).catch(() => null)
      )
    )

    // 收集缩略图查询
    const thumbQueries = []
    results.forEach((dish, i) => {
      if (dish && dish.thumbnail && dish.images && dish.images.length > 0) {
        thumbQueries.push({ index: i, menuId: dish._id, uid: dish.thumbnail })
      }
    })

    let thumbUrls = {}
    if (thumbQueries.length > 0) {
      try {
        const tasks = thumbQueries.map(q =>
          getApp().getImageUrls(q.menuId, [q.uid]).then(r => ({ index: q.index, url: r[q.uid] || '' }))
        )
        const urls = await Promise.all(tasks)
        urls.forEach(u => { thumbUrls[u.index] = u.url })
      } catch (e) {}
    }

    return items.map((item, i) => {
      const dish = results[i]
      return {
        ...item,
        deleted: !dish,
        dishId: dish ? dish._id : '',
        dishName: dish ? dish.name : item.name,
        thumbUrl: thumbUrls[i] || ''
      }
    })
  },

  onTapItem(e) {
    const { id, deleted } = e.currentTarget.dataset
    if (deleted) {
      wx.showToast({ title: '菜品已下架', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  async onAction(e) {
    const action = e.currentTarget.dataset.action
    const order = this.data.order
    if (!order) return

    let title, targetStatus
    if (action === 'accept') {
      title = '确认接单？'
      targetStatus = 'accepted'
    } else if (action === 'complete') {
      title = '确认完成？'
      targetStatus = 'completed'
    } else if (action === 'cancel') {
      title = '确认取消订单？'
      targetStatus = 'cancelled'
    }

    const confirm = await new Promise(resolve => {
      wx.showModal({ title, showCancel: true, success: (r) => resolve(r.confirm) })
    })
    if (!confirm) return

    try {
      await api.updateOrderStatus(order._id, targetStatus)
      wx.showToast({ title: '操作成功', icon: 'success' })
      this.loadOrder(order._id)
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onReorder() {
    const order = this.data.order
    if (!order || order.status !== 'cancelled') return

    wx.showModal({
      title: '重新下单',
      content: '将订单中的菜品重新加入购物车？',
      success: (res) => {
        if (res.confirm) {
          getApp().mergeToCart(order.items)
          wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1200 })
          setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1200)
        }
      }
    })
  }
})
