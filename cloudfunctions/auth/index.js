const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function getCaller(openid) {
  const res = await db.collection('whitelist').where({ openid }).get()
  if (res.data.length === 0) return null
  return res.data[0]
}

function maskOpenid(openid) {
  if (!openid || openid.length <= 10) return openid
  return openid.slice(0, 6) + '****' + openid.slice(-4)
}

exports.main = async (event) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (action === 'check') {
    const caller = await getCaller(openid)
    return {
      allowed: !!caller,
      openid,
      role: caller ? (caller.role || 'user') : '',
      id: caller ? caller._id : ''
    }
  }

  if (action === 'list') {
    const caller = await getCaller(openid)
    if (!caller || caller.role !== 'admin') return { error: 'forbidden' }
    const res = await db.collection('whitelist').orderBy('createdAt', 'desc').get()
    const users = res.data.map(u => ({
      ...u,
      openid: maskOpenid(u.openid),
      isSelf: u.openid === openid
    }))
    return { users }
  }

  if (action === 'add') {
    const caller = await getCaller(openid)
    if (!caller || caller.role !== 'admin') return { error: 'forbidden' }
    if (!data.openid || !data.openid.trim()) return { error: 'openid required' }

    const exists = await db.collection('whitelist').where({ openid: data.openid.trim() }).count()
    if (exists.total > 0) return { error: 'user already exists' }

    const now = Date.now()
    const res = await db.collection('whitelist').add({
      data: {
        openid: data.openid.trim(),
        nickname: data.nickname || '',
        role: data.role || 'user',
        createdAt: now
      }
    })
    return { id: res._id }
  }

  if (action === 'update') {
    const caller = await getCaller(openid)
    if (!caller || caller.role !== 'admin') return { error: 'forbidden' }
    const updateData = {}
    if (data.nickname !== undefined) updateData.nickname = data.nickname || ''
    if (data.role) updateData.role = data.role
    await db.collection('whitelist').doc(data.id).update({ data: updateData })
    return { ok: true }
  }

  if (action === 'remove') {
    const caller = await getCaller(openid)
    if (!caller || caller.role !== 'admin') return { error: 'forbidden' }
    await db.collection('whitelist').doc(data.id).remove()
    return { ok: true }
  }

  return { error: 'unknown action' }
}
