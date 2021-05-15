// components/linklink/linklink.js
import { storeBindingsBehavior } from 'mobx-miniprogram-bindings'
import { store } from './store'
import utils from '../../common/utils'
const GameCode ='xxx' 
Component({
  /**
   * 组件的属性列表
   */
  properties: {

  },
  behaviors: [storeBindingsBehavior],
  /**
   * 组件的初始数据
   */
  data: {
    gameCode: GameCode,
    globalData: {},
    gameUUid: '',
    newGame: {
      open: true,
      isStarting: false
    },
    confirmExit: {
      open: false,
    },
    endGame: {
      open: true,
      isSubmitting: false,
      submitted: false,
      isStarting: false
    },
  },
  storeBindings: {
    store,
    fields: {
      gameTable: (store) => store.showGameTabe,
      gameTableVLen: (store) => store.gameTableVLen,
      gameTableHLen: (store) => store.gameTableHLen,
      gameTableTdWidth: (store) => store.gameTableTdWidth,
      gameIsFinished: (store) => store.isFinished,
      gameTimeSpendPercent: (store) => store.timeSpendPercent,
      gameTimeoutMax: (store) => store.TimeoutMax,
      gameTimeSpend: (store) => store.timeSpend,
      gameTimeLeft: (store) => store.TimeoutMax - store.timeSpend,
      gameScore: (store) => store.score,
      gameScoreTime: (store) => store.scoreTime,
      /**
       * 牛宝宝数值，未完成也显示
       */
      gameScoreCount: (store) => store.scoreCount,
      gameLinkedCount: (store) => store.linkedCount,
      /**
       * 动画中
       */
      gameIsAnimating: (store) => store.isAnimating,
    },
    actions: {
      createTable: 'createTable',
      choosePointer: 'choosePointer',
      emptyPointers: 'emptyPointers',
      help: 'help',
      stopGame: 'stopGame',
      resumeGame: 'resumeGame',
      pauseGame: 'pauseGame'
    },
  },
  lifetimes: {
    // 生命周期函数，可以为函数，或一个在methods段中定义的方法名
    attached: function () {
      this.createTable()
      this.syncGlobalData()
      // console.log('---attached', this.data.gameTable)
    },
    moved: function () { },
    detached: function () {
      // console.log('---detached', this.data.gameTable)
      this.stopGame()
    },
  },
  pageLifetimes: {
    show: function () {
      // 页面被展示
      console.log('--show')
    },
    hide: function () {
      // 页面被隐藏
      console.log('--hide')
    },
    resize: function (size) {
      // 页面尺寸变化
    }
  },
  observers: {
    'gameIsFinished': function (gameIsFinished) {
      // 在 numberA 或者 numberB 被设置时，执行这个函数
      // console.log('---gameIsFinished observers',gameIsFinished)
      if (gameIsFinished) {
        wx.nextTick(() => {
          this.endGameActions(0)
        })
      }
    }
  },
  /**
   * 组件的方法列表
   */
  methods: {
    syncGlobalData() {
      // const userInfo = utils.getCurrentUserInfo()
      // const gameInfo = utils.getGameInfo(GameCode)
      // // console.log('--gameInfo-', gameInfo, userInfo)
      // this.setData({
      //   globalData: {
      //     gameInfo,
      //     userInfo
      //   }
      // })
    },
    async startNewGameByApi() {
      // const { res, err } = await utils.initGame(GameCode);
      // if (err || !res.gameId) {
      //   wx.showToast({
      //     title: err?.message || '接口出错了',
      //   })
      //   return false
      // }
      // console.log('start game', res.gameId)
      // this.setData({ gameUUid: res.gameId })
      return true
    },
    doPause() {
      this.setData({ confirmExit: { ...this.data.confirmExit, open: true } })
      this.pauseGame()
    },
    start() {
      if (this.data.gameIsAnimating) {
        return
      }
      this.createTable()
    },
    playNext() {
      this.createTable(true)
    },
    _cleanLink(linkedPointersCommonSt) {
      wx.nextTick(() => {
        console.log('---linkedPointersCommonSt', linkedPointersCommonSt)
        this.animate(`.cm-${linkedPointersCommonSt}`, [
          { opacity: 1.0 },
          { opacity: 0.5 },
          // { opacity: 0 },
          // { opacity: 1.0 },
          // { opacity: 0.5 },
          // { opacity: 0 },
          // { opacity: 1.0 },
          // { opacity: 0.5 },
          { opacity: 0 },
          { opacity: 1.0 },
        ], 160, () => {
          console.log(`清除了.cm-${linkedPointersCommonSt}上的opacity属性00`)
          this.clearAnimation(`.cm-${linkedPointersCommonSt}`, { opacity: true }, () => {
            console.log(`清除了.cm-${linkedPointersCommonSt}上的opacity属性`)
            this.emptyPointers(linkedPointersCommonSt)
          })
        })
      })
    },
    tapPointer(event) {
      const { tdidx, tridx } = event.currentTarget.dataset
      this.choosePointer({ rowIdx: tridx, colIdx: tdidx }, this._cleanLink.bind(this))
    },
    helpGame() {
      this.help((pointerIdx) => {
        this.choosePointer(pointerIdx, this._cleanLink.bind(this))
      })
    },
    async newGameButtontap(e) {
      const shouldGoBack = e.detail.item.value === 0;
      if (shouldGoBack) {
        // go back
        wx.navigateBack()
      } else {
        this.setData({ newGame: { ...this.data.newGame, isStarting: true } })
        const can = await this.startNewGameByApi()
        this.setData({ newGame: { ...this.data.newGame, isStarting: false } })
        can && this.start()
      }
      this.setData({ newGame: { ...this.data.newGame, open: false } })
      console.log(e.detail)
    },
    confirmExitButtontap(e) {
      const shouldGoBack = e.detail.item.value === 0;
      if (shouldGoBack) {
        // go back
        wx.navigateBack()
        this.stopGame()
      } else if (e.detail.item.value === 1) {
        // 继续游戏
        this.resumeGame()
      } else {
        // 重新来一局
        this.stopGame()
        // API
        this.playNext()
      }
      this.setData({ confirmExit: { ...this.data.confirmExit, open: false } })
    },
    endGameButtontap(e) {
      const index = e.detail.item.value;
      this.endGameActions(index)
    },
    async endGameActions(index, toSubmit) {
      if (index === 0 && (!this.data.endGame.submitted || toSubmit)) {
        // 结算，发送游戏结果
        this.setData({ endGame: { ...this.data.endGame, isSubmitting: true } })
        console.log('!!!!---submitGameScore linklink', this.data.gameUUid, GameCode, this.data.gameScore)
        const { res, err } = await utils.submitGameScore(this.data.gameUUid, GameCode, this.data.gameScore)
        console.log('---submitGameScore linklink result', res, err)
        // if (err) throw new Error(err?.message)
        this.setData({ endGame: { ...this.data.endGame, isSubmitting: false, } })
        if (err) {
          wx.showToast({
            title: err?.message || '接口出错了',
          })
          return
        }
        this.syncGlobalData()
        this.setData({ endGame: { ...this.data.endGame, isSubmitting: false, submitted: true, } })
        // return { validScore: res.score, totalScore: res.score, restCount: res.restCount }
      } else if (index === 1) {
        // 下一局

        // 开始游戏API
        // this.setData({ endGame: { ...this.data.endGame, isStarting: true } })
        // const can = await this.startNewGameByApi()
        // this.setData({ endGame: { ...this.data.endGame, isStarting: false } })
        // // 下一局
        // can && this.playNext()
        // this.setData({ endGame: { ...this.data.endGame, submitted: false } })


        this.stopGame();
        this.setData({ endGame: { ...this.data.endGame, submitted: false, }, newGame: { ...this.data.newGame, open: true } })
      } else if (index === 2 && this.data.endGame.submitted) {
        // 返回
        // go back
        wx.navigateBack()
        this.stopGame()
      }
    },
  }
})
