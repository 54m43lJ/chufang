function call(name, data) {
  return wx.cloud.callFunction({ name, data }).then(res => res.result)
}

module.exports = {
  // Auth
  checkAuth() {
    return call('auth', { action: 'check' })
  },
  listWhitelist() {
    return call('auth', { action: 'list' })
  },
  removeWhitelist(id) {
    return call('auth', { action: 'remove', data: { id } })
  },

  // Menu
  listMenu() {
    return call('menu', { action: 'list' })
  },
  getMenu(id) {
    return call('menu', { action: 'get', data: { id } })
  },
  addMenu(data) {
    return call('menu', { action: 'add', data })
  },
  updateMenu(id, data) {
    return call('menu', { action: 'update', data: { id, ...data } })
  },
  deleteMenu(id) {
    return call('menu', { action: 'delete', data: { id } })
  },

  // Order
  createOrder(items) {
    return call('order', { action: 'create', data: { items } })
  },
  listOrders(status) {
    return call('order', { action: 'list', data: status ? { status } : {} })
  },
  getOrder(id) {
    return call('order', { action: 'get', data: { id } })
  },
  updateOrderStatus(id, status) {
    return call('order', { action: 'updateStatus', data: { id, status } })
  },

  // Image
  uploadImage(menuId, index, fileID) {
    return call('image', { action: 'upload', data: { menuId, index, fileID } })
  },
  getImageUrls(menuIds) {
    return call('image', { action: 'getUrls', data: { menuIds } })
  },
  getThumbnailUrl(menuId, index) {
    return call('image', { action: 'getThumbnailUrl', data: { menuId, index } })
  },
  deleteImageDir(menuId) {
    return call('image', { action: 'deleteDir', data: { menuId } })
  }
}
