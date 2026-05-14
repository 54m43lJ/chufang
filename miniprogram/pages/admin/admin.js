const api = require('../../utils/api')

Page({
  data: {
    users: [],
    loading: true,

    // 生成邀请
    showInvite: false,
    qrBase64: '',
    qrTempPath: '',
    inviteRole: 'user',
    inviteNickname: '',
    generating: false,

    // 手动添加
    showAdd: false,
    addOpenid: '',
    addNickname: '',
    addRole: 'user',

    // 重命名
    showRename: false,
    renameId: '',
    renameNickname: ''
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

  /* ====== 生成邀请 ====== */
  onSelectRole(e) { this.setData({ inviteRole: e.currentTarget.dataset.role }) },
  onInputInviteNick(e) { this.setData({ inviteNickname: e.detail.value }) },

  async onGenerateInvite() {
    this.setData({ generating: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'invitation',
        data: {
          action: 'generate',
          data: {
            role: this.data.inviteRole,
            nickname: this.data.inviteNickname
          }
        }
      })
      const result = res.result
      if (result.qrBase64) {
        const buf = wx.base64ToArrayBuffer(result.qrBase64)
        const tempPath = `${wx.env.USER_DATA_PATH}/invite_${Date.now()}.jpg`
        wx.getFileSystemManager().writeFileSync(tempPath, buf, 'binary')
        this.setData({
          showInvite: true,
          qrBase64: `data:${result.contentType};base64,${result.qrBase64}`,
          qrTempPath: tempPath
        })
      }
    } catch (err) {
      wx.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      this.setData({ generating: false })
    }
  },

  onCloseInvite() { this.setData({ showInvite: false }) },

  onSaveImage() {
    if (!this.data.qrTempPath) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.qrTempPath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({ title: '需要相册权限', content: '请在设置中允许小程序保存图片到相册', showCancel: false })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  onShareImage() {
    if (!this.data.qrTempPath) return
    wx.showShareImageMenu({ path: this.data.qrTempPath, fail: () => wx.showToast({ title: '分享失败', icon: 'none' }) })
  },

  /* ====== 手动添加 ====== */
  onOpenAdd() {
    this.setData({ showAdd: true, addOpenid: '', addNickname: '', addRole: 'user' })
  },
  onCloseAdd() { this.setData({ showAdd: false }) },
  onInputAddOpenid(e) { this.setData({ addOpenid: e.detail.value }) },
  onInputAddNick(e) { this.setData({ addNickname: e.detail.value }) },
  onSelectAddRole(e) { this.setData({ addRole: e.currentTarget.dataset.role }) },

  async onSubmitAdd() {
    const { addOpenid, addNickname, addRole } = this.data
    if (!addOpenid.trim()) return wx.showToast({ title: '请输入 openid', icon: 'none' })
    try {
      await api.addWhitelist(addOpenid.trim(), addNickname.trim(), addRole)
      wx.showToast({ title: '已添加', icon: 'success' })
      this.setData({ showAdd: false })
      this.loadUsers()
    } catch (err) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  /* ====== 重命名 ====== */
  onOpenRename(e) {
    const { id } = e.currentTarget.dataset
    const user = this.data.users.find(u => u._id === id)
    this.setData({ showRename: true, renameId: id, renameNickname: user ? (user.nickname || '') : '' })
  },
  onCloseRename() { this.setData({ showRename: false }) },
  onInputRename(e) { this.setData({ renameNickname: e.detail.value }) },

  async onSubmitRename() {
    try {
      await api.renameWhitelist(this.data.renameId, this.data.renameNickname.trim())
      wx.showToast({ title: '已修改', icon: 'success' })
      this.setData({ showRename: false })
      this.loadUsers()
    } catch (err) {
      wx.showToast({ title: '修改失败', icon: 'none' })
    }
  },

  /* ====== 移除 ====== */
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

  noop() {}
})
