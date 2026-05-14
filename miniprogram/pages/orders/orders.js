const api = require('../../utils/api')

Page({
  data: {
    tabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待接单' },
      { key: 'accepted', label: '进行中' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ],
    activeTab: '',
    orders: [],
    loading: true
  },

  onShow() {
    if (!getApp().checkAccess()) return
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => wx.stopPullDownRefresh())
  },

  async loadOrders() {
    this.setData({ loading: true })
    try {
      const status = this.data.activeTab || undefined
      const res = await api.listOrders(status)
      const orders = res.items.map(o => ({
        ...o,
        timeText: this.formatTime(o.createdAt)
      }))
      this.setData({ orders, loading: false })
    } catch (err) {
      console.error('load orders failed:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.key
    this.setData({ activeTab: tab }, () => this.loadOrders())
  },

  onTapOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  },

  async onQuickAction(e) {
    const { id, action } = e.currentTarget.dataset
    const label = action === 'accept' ? '接单' : '完单'
    const confirm = await new Promise(r => {
      wx.showModal({ title: `确认${label}？`, showCancel: true, success: (res) => r(res.confirm) })
    })
    if (!confirm) return
    try {
      await api.updateOrderStatus(id, action === 'accept' ? 'accepted' : 'completed')
      wx.showToast({ title: `已${label}`, icon: 'success' })
      this.loadOrders()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onQuickCancel(e) {
    const id = e.currentTarget.dataset.id
    const confirm = await new Promise(r => {
      wx.showModal({ title: '确认取消订单？', showCancel: true, success: (res) => r(res.confirm) })
    })
    if (!confirm) return
    try {
      await api.updateOrderStatus(id, 'cancelled')
      wx.showToast({ title: '已取消', icon: 'success' })
      this.loadOrders()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  statusLabel(status) {
    const map = {
      pending: '待接单',
      accepted: '进行中',
      completed: '已完成',
      cancelled: '已取消'
    }
    return map[status] || status
  },

  statusClass(status) {
    return 'status-tag status-' + status
  }
})
