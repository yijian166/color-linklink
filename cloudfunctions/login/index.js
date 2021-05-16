// 云函数模板
// 部署：在 cloud-functions/login 文件夹右击选择 “上传并部署”

const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  // env: 'product-0g9sw6v93da87f4f',
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database();
const _ = db.command;

/**
 * 这个示例将经自动鉴权过的小程序用户 openid 返回给小程序端
 * 
 * event 参数包含小程序端调用传入的 data
 * 
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  let userInfo = {}

  try {
    const res = await db.collection('user').doc(OPENID).get()
    userInfo = res.data;
    delete userInfo._id
  } catch (error) {
    console.log('---error',error)
  }
  const now = new Date()
  await db.collection('user').doc(OPENID).set({
    data: {
      _createTime:now,
      ...userInfo,
      _updateTime:now,
      _openid:OPENID,
    }
  })
  return {
    code:0,
    data: {
      user: userInfo,
      _openid: OPENID
    }
  }
}

