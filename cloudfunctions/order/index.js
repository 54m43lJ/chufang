const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const VALID_TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
}

exports.main = async (event) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    case 'create': {
      const now = Date.now()
      const items = data.items.map(item => ({
        menuId: item.menuId,
        name: item.name,
        quantity: item.quantity
      }))
      const res = await db.collection('orders').add({
        data: {
          openid,
          items,
          status: 'pending',
          createdAt: now,
          updatedAt: now
        }
      })
      return { id: res._id }
    }

    case 'list': {
      const query = db.collection('orders').orderBy('createdAt', 'desc')
      if (data && data.status) {
        const res = await query.where({ status: data.status }).get()
        return { items: res.data }
      }
      const res = await query.get()
      return { items: res.data }
    }

    case 'get': {
      const res = await db.collection('orders').doc(data.id).get()
      return { item: res.data }
    }

    case 'updateStatus': {
      const order = await db.collection('orders').doc(data.id).get()
      if (!order.data) return { error: 'order not found' }

      const currentStatus = order.data.status
      const targetStatus = data.status

      if (!VALID_TRANSITIONS[currentStatus].includes(targetStatus)) {
        return { error: `cannot transition from ${currentStatus} to ${targetStatus}` }
      }

      await db.collection('orders').doc(data.id).update({
        data: {
          status: targetStatus,
          updatedAt: Date.now()
        }
      })
      return { updated: true }
    }

    default:
      return { error: 'unknown action' }
  }
}
