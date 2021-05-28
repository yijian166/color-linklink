//index.js
import utils from '../../common/utils';
const app = getApp()
Page({
  data: {
    avatarUrl: './user-unlogin.png',
    userInfo: {},
    hasUserInfo: false,
    _openid: '',
    gameColors: [],
    bgColor: '',
    frontColor: '',
    gameId: '',
    rankN: 0
  },
  reSet() {
    this.setData({
      _openid: '',
      gameColors: [],
      bgColor: '#f5f5f5',
      frontColor: '#000',
      gameId: ''
    })
  },

  async onLoad() {
    this.reSet()
    await this.getInfo()
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      })
    }
  },
  async getInfo() {
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
    const res = await utils.callCloudFunction('getUserRank')
    console.log('---getUserRank', res)
    if (res.code) {
      return
    }
    for (let i = 0; i < res.data.length; i++) {
      if (res.data[i]._openid === data._openid) {
        console.log('---getUserRank i', i)
        this.setData({
          rankN: i + 1
        })
      }
    }
  },
  async newGame() {
    console.log('---newGame')
    if (this.data.gameId) {
      return
    }
    await wx.showLoading()
    const {
      code,
      data
    } = await utils.callCloudFunction('newGame')
    await wx.hideLoading()
    if (code) {
      wx.showToast({
        title: '接口错误',
        icon: 'error'
      })
    }
    this.setData({
      gameColors: data.colors,
      gameId: data._id,
      frontColor: data.frontColor,
      bgColor: data.bgColor
    })
  },
  async endGame(e) {
    console.log('---endGame', e)
    await wx.showLoading()
    const {
      code,
      data
    } = await utils.callCloudFunction('endGame', {
      gameScore: e.detail.gameScore,
      gameId: this.data.gameId
    })
    console.log('---endGame rest', code, data)
    await wx.hideLoading()
    if (code) {
      wx.showToast({
        title: '接口错误',
        icon: 'error'
      })
    }
    wx.showToast({
      title: '结算成功',
      icon: "success"
    })
    this.reSet()
    await this.getInfo()
  },
  toHistory() {
    wx.navigateTo({
      url: '/pages/history/index',
    })
  },
  async getUserProfile(event) {
    const {
      openid
    } = event.currentTarget.dataset
    try {
      const res = await wx.getUserProfile({
        desc: '展示头像，来感受颜色的魅力吧!',
      })
      console.log('---', res, openid)
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
      console.log('---', error)
    }
  },

})