// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  // env: 'product-0g9sw6v93da87f4f',
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database();
const _ = db.command;


// 云函数入口函数
exports.main = async (event, context) => {
  const {
    OPENID
  } = cloud.getWXContext()

  console.log('event', event)

  const res = await db.collection('user').aggregate().match({
      deActive: _.neq(true)
    })
    .sort({
      score: -1
    })
    .limit(1000)
    .end()
    
  return {
    code: 0,
    data: res.list
  }
}