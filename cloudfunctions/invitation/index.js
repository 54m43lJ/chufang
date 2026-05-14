const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const crypto = require('crypto')

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
          used: false,
          expiresAt,
          createdAt: now
        }
      })

      let qr, contentType
      try {
        const qrRes = await cloud.openapi.wxacode.getUnlimited({
          scene: token,
          page: 'pages/index/index',
          envVersion: 'release',
          checkPath: false
        })
        qr = qrRes.buffer
        contentType = qrRes.contentType
      } catch (e) {
        // 非正式版回退到 get
        const qrRes = await cloud.openapi.wxacode.get({
          path: `pages/index/index?token=${token}`,
          envVersion: 'trial'
        })
        qr = qrRes.buffer
        contentType = qrRes.contentType
      }

      return {
        token,
        qrBase64: qr.toString('base64'),
        contentType
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

      // 获取完整记录拿 role
      const inv = await db.collection('invitations').where({ token }).get()
      const invData = inv.data[0]

      await db.collection('whitelist').add({
        data: {
          openid: wxContext.OPENID,
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
