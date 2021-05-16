//app.js

App({
  async onLaunch () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'product-0g9sw6v93da87f4f',
        traceUser: true,
      })
    }

    this.globalData = {}
  }
})
