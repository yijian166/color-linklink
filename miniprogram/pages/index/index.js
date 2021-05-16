//index.js
import utils from '../../common/utils';
const app = getApp()
Page({
  data: {
    avatarUrl: './user-unlogin.png',
    userInfo: {},
    hasUserInfo: false,
    _openid:''
  },

  async onLoad() {
    const {
      code,
      data
    } = await utils.callCloudFunction('login')
    if (code) {
      wx.showToast({
        title: '登陆失败，请重试',
        icon: "error"
      })
      return
    }
    this.setData({
      _openid: data._openid,
      userInfo: data.user,
      hasUserInfo: true
    })
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      })
    }
  },

  async getUserProfile(event) {
    const { openid } = event.currentTarget.dataset
    try {
      const res = await wx.getUserProfile({
        desc: '展示昵称，来一局精彩的对决吧!',
      })
      console.log('---',res,openid)
      this.setData({
        userInfo: res.userInfo,
        hasUserInfo: true,
      })
      if (openid) {
        await wx.cloud.database().collection('user').doc(openid).update({
          data: {
            ...res.userInfo,
            _updateTime: new Date()
          }
        })
      }
    } catch (error) {
      console.log('---',error)
    }
  },

  onGetUserInfo: function (e) {
    if (!this.data.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        userInfo: e.detail.userInfo,
        hasUserInfo: true,
      })
    }
  },

  onGetOpenid: function () {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        app.globalData.openid = res.result.openid
        wx.navigateTo({
          url: '../userConsole/userConsole',
        })
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
        wx.navigateTo({
          url: '../deployFunctions/deployFunctions',
        })
      }
    })
  },

  // 上传图片
  doUpload: function () {
    // 选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        wx.showLoading({
          title: '上传中',
        })

        const filePath = res.tempFilePaths[0]

        // 上传图片
        const cloudPath = `my-image${filePath.match(/\.[^.]+?$/)[0]}`
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: res => {
            console.log('[上传文件] 成功：', res)

            app.globalData.fileID = res.fileID
            app.globalData.cloudPath = cloudPath
            app.globalData.imagePath = filePath

            wx.navigateTo({
              url: '../storageConsole/storageConsole'
            })
          },
          fail: e => {
            console.error('[上传文件] 失败：', e)
            wx.showToast({
              icon: 'none',
              title: '上传失败',
            })
          },
          complete: () => {
            wx.hideLoading()
          }
        })
      },
      fail: e => {
        console.error(e)
      }
    })
  },

})