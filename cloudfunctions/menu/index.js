const cloud = require('wx-server-sdk')
const COS = require('cos-nodejs-sdk-v5')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const BUCKET = 'dishes-1413628630'
const REGION = 'ap-beijing'

function getCosClient() {
  return new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY
  })
}

async function deleteImageDir(menuId) {
  const cos = getCosClient()
  const prefix = `dishes/${menuId}/`
  const list = await cos.getBucket({
    Bucket: BUCKET,
    Region: REGION,
    Prefix: prefix
  })
  const objects = (list.Contents || []).map(o => ({ Key: o.Key }))
  if (objects.length > 0) {
    await cos.deleteMultipleObject({
      Bucket: BUCKET,
      Region: REGION,
      Objects: objects
    })
  }
}

exports.main = async (event) => {
  const { action, data } = event

  switch (action) {
    case 'list': {
      const res = await db.collection('menu')
        .orderBy('createdAt', 'desc')
        .get()
      return { items: res.data }
    }

    case 'get': {
      const res = await db.collection('menu').doc(data.id).get()
      return { item: res.data }
    }

    case 'add': {
      const now = Date.now()
      const res = await db.collection('menu').add({
        data: {
          name: data.name,
          category: data.category,
          images: data.images || [],
          thumbnail: data.thumbnail || '',
          description: data.description || '',
          createdAt: now,
          updatedAt: now
        }
      })
      return { id: res._id }
    }

    case 'update': {
      const res = await db.collection('menu').doc(data.id).update({
        data: {
          name: data.name,
          category: data.category,
          images: data.images || [],
          thumbnail: data.thumbnail || '',
          description: data.description || '',
          updatedAt: Date.now()
        }
      })
      return { updated: res.stats.updated }
    }

    case 'delete': {
      try {
        await deleteImageDir(data.id)
      } catch (e) {}
      const res = await db.collection('menu').doc(data.id).remove()
      return { removed: res.stats.removed }
    }

    default:
      return { error: 'unknown action' }
  }
}
