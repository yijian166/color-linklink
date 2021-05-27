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
  const { OPENID } = cloud.getWXContext()

  const randomColor = await db
    .collection("color")
    .aggregate()
    .sample({
      size: 1,
    })
    .limit(1)
    .end();


  console.log('rd color',randomColor)
  const color = randomColor.list[0];
  color.colorId = color._id;
  delete color._id
  const res = await db.collection('game').add({
    data: {
      ...randomColor.list[0],
      _openid: OPENID,
      _createTime: new Date()
    }
  })
  const game = await db.collection('game').doc(res._id).get()
  console.log('new game',res)
  return {
    code:0,
    data:game.data
  }
}