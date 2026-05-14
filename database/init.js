/**
 * 数据库初始化说明
 *
 * 在微信云开发控制台中需要手动创建以下三个集合：
 *
 * 1. whitelist — 白名单
 *    字段：openid (string), nickname (string, 可选), createdAt (date)
 *    索引：openid 唯一索引
 *
 * 2. menu — 菜品
 *    字段：name (string), category (string), image (string), description (string),
 *          createdAt (number), updatedAt (number)
 *    权限：所有用户可读，所有用户可写（开放模式）
 *
 * 3. orders — 订单
 *    字段：openid (string), items (array), status (string),
 *          createdAt (number), updatedAt (number)
 *    权限：所有用户可读，所有用户可写（开放模式）
 *
 * ---
 *
 * 步骤：
 * 1. 打开微信开发者工具 → 云开发控制台
 * 2. 数据库 → 添加集合，依次创建 whitelist, menu, orders
 * 3. 在 whitelist 中添加一条记录：{ openid: "你的openid", createdAt: Date.now() }
 *    获取 openid 的方法：先运行小程序，在云函数日志中查看打印的 openid
 *
 * 或者用此脚本批量创建（需在云函数中执行）：
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function init() {
  // 创建集合（如果已存在会报错，忽略即可）
  const collections = ['whitelist', 'menu', 'orders']
  for (const name of collections) {
    try {
      await db.createCollection(name)
      console.log(`集合 ${name} 创建成功`)
    } catch (e) {
      if (e.errCode === -502005) {
        console.log(`集合 ${name} 已存在，跳过`)
      } else {
        console.error(`创建 ${name} 失败:`, e)
      }
    }
  }
}

init()
