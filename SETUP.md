# 系统初始化步骤

## 1. 前置条件

- 已注册微信小程序，获取 **AppID**
- 在微信开发者工具中开通**云开发**（免费额度即可）
- 获取**云环境 ID**（云开发控制台 → 设置 → 环境 ID）

## 2. 配置项目

修改以下两个文件：

**`project.config.json`** — 填入 AppID：
```json
"appid": "你的小程序AppID"
```

**`miniprogram/app.js`** 第 11 行 — 填入云环境 ID：
```js
env: '你的云环境ID'
```

## 3. 配置腾讯云 COS

图片文件存储在腾讯云 COS 桶 `dishes-1413628630`（`ap-beijing`）。需要为 `image` 和 `menu` 两个云函数配置访问凭证。

### 3.1 获取子用户密钥

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cam) → 访问管理 → 用户 → 用户列表
2. 找到已创建的子用户 → 点击用户名 → **API 密钥** → 查看 SecretId 和 SecretKey

> 没有子用户？在 [新建用户](https://console.cloud.tencent.com/cam/user/userType) 创建，方式选"自定义创建"→"可访问资源并接收消息"，搜索并勾选 `QcloudCOSDataFullControl` 策略。

### 3.2 配置 COS 桶

1. 登录 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) → 找到 `dishes-1413628630`
2. **权限管理 → 存储桶访问权限**：勾选"公有读私有写"（图片通过签名 URL 访问，桶本身不开放目录浏览）

### 3.3 配置云函数环境变量

在微信开发者工具 → 云开发控制台 → 云函数，对 `image` 和 `menu` 分别添加：

| 变量名 | 值 |
|--------|-----|
| `COS_SECRET_ID` | 子用户的 SecretId |
| `COS_SECRET_KEY` | 子用户的 SecretKey |

### 3.4 部署云函数

对 `cloudfunctions/` 下的目录逐一右键 → **上传并部署**（选"云端安装依赖"，会自动安装 `cos-nodejs-sdk-v5` 等 npm 包）：

- `auth`
- `menu`
- `order`
- `image`
- `invitation`

## 4. 创建数据库集合

在云开发控制台 → 数据库，手动创建三个集合：

| 集合名 | 用途 |
|--------|------|
| `whitelist` | 白名单 |
| `menu` | 菜品 |
| `orders` | 订单 |
| `invitations` | 邀请码 |

四个集合的权限均设为"所有用户可读，所有用户可写"。

## 5. 添加白名单

### 首次设置（管理员手动插入）

在云开发控制台 → 数据库 → `whitelist` 集合，添加自己的记录：

```json
{
  "openid": "你的openid",
  "role": "admin",
  "createdAt": 1715200000000
}
```

`createdAt` 填当前时间戳（毫秒）。**必须设 `role: "admin"`** 才能访问白名单管理功能。

### 后续添加用户

管理员进入小程序 → "管理" tab → "白名单管理" → 点击"生成邀请" → 把生成的二维码发送给目标用户。用户扫码后自动注册，无需手动复制 openid。>`role` 字段可选 `admin` 或 `user`。

## 6. 验证

1. 微信开发者工具中点击编译
2. 如果你的 openid 在白名单中 → 正常进入菜品列表页，管理 tab 可见"白名单管理"入口（admin 角色）
3. 如果不在白名单中 → 跳转到无权限页面，页面显示你的 openid（默认掩码），可一键复制发送给管理员
4. 在管理页生成邀请二维码 → 扫一扫（需体验成员身份）→ 自动注册并进入
5. 通过"管理菜品"添加菜品 → 浏览 → 加购物车 → 下单 → 接单 → 完成，走通全流程

## 常见问题

**Q: 云函数调用报错 "env not found"**  
A: 检查 `app.js` 中的云环境 ID 是否正确，确认云开发已开通。

**Q: 数据库写入报错 "collection not found"**  
A: 确认已在云开发控制台手动创建了对应集合。

**Q: 图片上传失败**  
A: 检查 `image` 和 `menu` 云函数的环境变量 `COS_SECRET_ID` / `COS_SECRET_KEY` 是否已配置，子用户是否有 COS 读写权限。
