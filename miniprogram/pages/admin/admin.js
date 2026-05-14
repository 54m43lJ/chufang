const api = require('../../utils/api')

Page({
  data: {
    users: [],
    loading: true,
    showInvite: false,
    qrBase64: '',
    inviteRole: 'user',
    generating: false
  },

  onLoad() {
    if (!getApp().checkAccess() || getApp().globalData.role !== 'admin') {
      wx.navigateBack()
      return
    }
  },

  onShow() {
    if (getApp().globalData.role !== 'admin') return
    this.loadUsers()
  },

  async loadUsers() {
    this.setData({ loading: true })
    try {
      const res = await api.listWhitelist()
      this.setData({ users: res.users, loading: false })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onRemove(e) {
    const { id, openid: targetOpenid } = e.currentTarget.dataset
    if (targetOpenid === getApp().globalData.openid) {
      wx.showToast({ title: '不能删除自己', icon: 'none' })
      return
    }
    wx.showModal({
      title: '移除用户',
      content: '确定从白名单移除此用户？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.removeWhitelist(id)
            wx.showToast({ title: '已移除', icon: 'success' })
            this.loadUsers()
          } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }) }
        }
      }
    })
  },

  onSelectRole(e) {
    this.setData({ inviteRole: e.currentTarget.dataset.role })
  },

  async onGenerateInvite() {
    this.setData({ generating: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'invitation',
        data: { action: 'generate', data: { role: this.data.inviteRole } }
      })
      const result = res.result
      if (result.qrBase64) {
        this.setData({
          showInvite: true,
          qrBase64: `data:${result.contentType};base64,${result.qrBase64}`
        })
      }
    } catch (err) {
      wx.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      this.setData({ generating: false })
    }
  },

  onCloseInvite() {
    this.setData({ showInvite: false })
  },

  noop() {}
})
