const api = require('../../utils/api')

Page({
  data: {
    dishes: [],
    loading: true,
    isAdmin: false,
    showForm: false,
    editingId: '',
    pickerIndex: 0,
    uploading: false,

    // 图片
    existingUids: [],
    existingUrls: {},
    removedUids: [],
    newImages: [],
    thumbRef: null,  // { uid } | { newIdx: number }

    form: {
      name: '',
      category: '',
      description: ''
    },
    categories: ['热菜', '凉菜', '饮品', '主食', '小吃', '其他']
  },

  onShow() {
    if (!getApp().checkAccess()) return
    this.setData({ isAdmin: getApp().globalData.role === 'admin' })
    this.loadDishes()
  },

  onGoAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  async loadDishes() {
    this.setData({ loading: true })
    try {
      const res = await api.listMenu()
      this.setData({ dishes: res.items, loading: false })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onAdd() {
    this.setData({
      showForm: true, editingId: '', pickerIndex: 0,
      existingUids: [], existingUrls: {}, removedUids: [],
      newImages: [], thumbRef: null,
      form: { name: '', category: this.data.categories[0], description: '' }
    })
  },

  async onEdit(e) {
    const id = e.currentTarget.dataset.id
    const dish = this.data.dishes.find(d => d._id === id)
    if (!dish) return

    const existingUids = dish.images || []
    let existingUrls = {}

    if (existingUids.length > 0) {
      try {
        existingUrls = await getApp().getImageUrls(id, existingUids)
      } catch (e) {}
    }

    const thumbRef = dish.thumbnail ? { uid: dish.thumbnail } : null

    this.setData({
      showForm: true, editingId: id,
      pickerIndex: this.data.categories.indexOf(dish.category),
      existingUids, existingUrls, removedUids: [],
      newImages: [], thumbRef,
      form: { name: dish.name, category: dish.category, description: dish.description || '' }
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除菜品',
      content: '确定删除此菜品？图片也会一并删除。',
      success: async (res) => {
        if (res.confirm) {
          try { await api.deleteMenu(id); wx.showToast({ title: '已删除', icon: 'success' }); this.loadDishes() }
          catch (err) { wx.showToast({ title: '删除失败', icon: 'none' }) }
        }
      }
    })
  },

  /* ====== 已有图片（编辑模式） ====== */

  onRemoveExisting(e) {
    const uid = e.currentTarget.dataset.uid
    const idx = this.data.existingUids.indexOf(uid)
    if (idx < 0) return

    const existingUids = [...this.data.existingUids]
    existingUids.splice(idx, 1)
    // delete this.data.existingUrls[uid]  // 非必要，后期酌情启用

    const removedUids = [...this.data.removedUids, uid]
    let thumbRef = this.data.thumbRef
    if (thumbRef && thumbRef.uid === uid) {
      thumbRef = null
    }
    this.setData({ existingUids, removedUids, thumbRef })
  },

  onSetExistingThumb(e) {
    this.setData({ thumbRef: { uid: e.currentTarget.dataset.uid } })
  },

  /* ====== 新图片 ====== */

  onChooseImage() {
    const remain = 9 - this.data.newImages.length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ newImages: this.data.newImages.concat(paths) })
      }
    })
  },

  onRemoveNewImage(e) {
    const idx = parseInt(e.currentTarget.dataset.index)
    const newImages = [...this.data.newImages]
    newImages.splice(idx, 1)
    let thumbRef = this.data.thumbRef
    if (thumbRef && thumbRef.newIdx != null) {
      if (thumbRef.newIdx === idx) { thumbRef = null }
      else if (thumbRef.newIdx > idx) { thumbRef = { newIdx: thumbRef.newIdx - 1 } }
    }
    this.setData({ newImages, thumbRef })
  },

  onSetNewThumb(e) {
    this.setData({ thumbRef: { newIdx: parseInt(e.currentTarget.dataset.index) } })
  },

  /* ====== 表单 ====== */

  onInputName(e) { this.setData({ 'form.name': e.detail.value }) },
  onPickCategory(e) {
    const idx = parseInt(e.detail.value)
    this.setData({ 'form.category': this.data.categories[idx], pickerIndex: idx })
  },
  onInputDesc(e) { this.setData({ 'form.description': e.detail.value }) },
  noop() {},
  onCancelForm() {
    if (this.data.uploading) return
    this.setData({ showForm: false })
  },

  async onSubmitForm() {
    const { form, editingId, existingUids, removedUids, newImages, thumbRef, uploading } = this.data
    if (uploading) return
    if (!form.name.trim()) return wx.showToast({ title: '请输入菜品名称', icon: 'none' })
    if (!form.category.trim()) return wx.showToast({ title: '请选择分类', icon: 'none' })

    this.setData({ uploading: true })
    try {
      let menuId = editingId

      if (editingId) {
        // 编辑：delete 被删除的 + upload 新增的
        const result = await getApp().updateImages(editingId, removedUids, newImages)
        const keptUids = existingUids.filter(u => !removedUids.includes(u))
        const allUids = keptUids.concat(result.uids)

        let thumbnail = ''
        if (thumbRef) {
          thumbnail = thumbRef.uid || result.uids[thumbRef.newIdx] || ''
        }
        await api.updateMenu(editingId, { ...form, images: allUids, thumbnail })
      } else {
        // 新增
        const res = await api.addMenu({ ...form, images: [], thumbnail: '' })
        menuId = res.id
        const result = await getApp().updateImages(menuId, [], newImages)

        let thumbnail = ''
        if (thumbRef && thumbRef.newIdx != null) {
          thumbnail = result.uids[thumbRef.newIdx] || ''
        } else if (result.uids.length > 0) {
          thumbnail = result.uids[0]
        }
        await api.updateMenu(menuId, { ...form, images: result.uids, thumbnail })
      }

      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({ showForm: false })
      this.loadDishes()
    } catch (err) {
      console.error('save dish failed:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ uploading: false })
    }
  }
})
