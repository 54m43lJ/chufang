const cloud = require('wx-server-sdk')
const COS = require('cos-nodejs-sdk-v5')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const BUCKET = 'dishes-1413628630'
const REGION = 'ap-beijing'
const SIGN_EXPIRES = 900

function getCosClient() {
  return new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY
  })
}

function cosKey(menuId, uid) {
  return `dishes/${menuId}/${uid}`
}

function cosPrefix(menuId) {
  return `dishes/${menuId}/`
}

function genUid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

exports.main = async (event) => {
  const { action, data } = event

  switch (action) {

    case 'update': {
      const { menuId, delete: delUidsRaw = [], upload: fileIDsRaw = [] } = data

      // 校验与去重
      const delUids = [...new Set(delUidsRaw)]
      const uploadList = [...new Set(fileIDsRaw)].filter(f => !!f)

      // delete 和 upload 中同一值冲突
      const delSet = new Set(delUids)
      const overlap = uploadList.find(f => delSet.has(f))
      if (overlap) {
        return { error: 'conflict: same value in delete and upload', value: overlap }
      }

      const cos = getCosClient()

      // 删除
      for (const uid of delUids) {
        await cos.deleteObject({
          Bucket: BUCKET,
          Region: REGION,
          Key: cosKey(menuId, uid)
        }).catch(() => {})
      }

      // 上传
      const uids = []
      for (const fileID of uploadList) {
        const uid = genUid()
        const key = cosKey(menuId, uid)
        const dlRes = await cloud.downloadFile({ fileID })
        await cos.putObject({
          Bucket: BUCKET,
          Region: REGION,
          Key: key,
          Body: dlRes.fileContent
        })
        await cloud.deleteFile({ fileList: [fileID] }).catch(() => {})
        uids.push(uid)
      }

      return { uids }
    }

    case 'getUrls': {
      const { menuId, uids = [] } = data
      const cos = getCosClient()
      const urls = {}

      for (const uid of uids) {
        try {
          urls[uid] = cos.getObjectUrl({
            Bucket: BUCKET,
            Region: REGION,
            Key: cosKey(menuId, uid),
            Sign: true,
            Expires: SIGN_EXPIRES
          })
        } catch (e) {
          urls[uid] = ''
        }
      }
      return { urls }
    }

    case 'deleteDir': {
      const { menuId } = data
      const prefix = cosPrefix(menuId)
      const cos = getCosClient()

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
      return { ok: true }
    }

    default:
      return { error: 'unknown action' }
  }
}
