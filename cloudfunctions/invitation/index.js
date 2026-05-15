const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const crypto = require('crypto')
const cfg = require('./config.json')

exports.main = async (event) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  switch (action) {

    case 'generate': {
      const token = crypto.randomBytes(16).toString('hex')
      const now = Date.now()
      const expiresAt = now + (data.expiresInDays || 7) * 86400000

      await db.collection('invitations').add({
        data: {
          token,
          role: data.role || 'user',
          nickname: data.nickname || '',
          used: false,
          expiresAt,
          createdAt: now
        }
      })

      const qrRes = await cloud.openapi.wxacode.get({
        path: `pages/index/index?token=${token}`,
        envVersion: cfg.envVersion || 'trial'
      })

      return {
        token,
        qrBase64: qrRes.buffer.toString('base64'),
        contentType: qrRes.contentType
      }
    }

    case 'claim': {
      const { token } = data
      const now = Date.now()

      const res = await db.collection('invitations')
        .where({
          token,
          used: false,
          expiresAt: db.command.gt(now)
        })
        .update({ data: { used: true } })

      if (res.stats.updated === 0) {
        return { error: 'invitation is invalid, expired, or already used' }
      }

      const inv = await db.collection('invitations').where({ token }).get()
      const invData = inv.data[0]

      await db.collection('whitelist').add({
        data: {
          openid: wxContext.OPENID,
          nickname: invData.nickname || '',
          role: invData.role,
          createdAt: now
        }
      })

      return { ok: true, role: invData.role }
    }

    default:
      return { error: 'unknown action' }
  }
}
