import { observable, action, autorun } from 'mobx-miniprogram'
import { shuffle } from './utils'
// 横向格子数量
const CanvasHNum = 6;
// 纵向格子数量
const CanvasVNum = 7;

const wxInfo = wx.getSystemInfoSync()
const SizeConf = {
  safeAreaH: wxInfo.screenHeight - wxInfo.safeArea.bottom,
  height: wxInfo.windowHeight,
  width: wxInfo.windowWidth,
  bodyHeight: wxInfo.windowHeight - wxInfo.statusBarHeight - 44
}
console.log('---sizecon', SizeConf)
const TimeoutMax = 40;


Object.defineProperty(Array.prototype, 'first', {
  get() {
    if (this.length === 0) {
      throw new Error('out of range')
    }
    return this[0]
  },
  enumerable: false,
  configurable: false
});
Object.defineProperty(Array.prototype, 'last', {
  get() {
    if (this.length === 0) {
      throw new Error('out of range')
    }
    return this[this.length - 1]
  },
  enumerable: false,
  configurable: false
});


export const store = observable({

  // 基本配置
  CanvasHNum,
  CanvasVNum,
  Pointers: [],
  TimeoutMax,

  // 游戏棋盘
  gameTable: [],

  // 花费时间
  timeSpend: 0,
  currentTimer: null,
  // 是否暂停游戏
  isPausing: false,

  // 连成数 得分规律
  scoreRange: [[5, 2], [10, 4], [15, 6], [20, 8], [21, 10]],
  // 完成一局，根据时间的奖励
  scoreWithTime: [[25, 4], [24, 9], [23, 14], [22, 19], [21, 24], [20, 29, 34]],

  // 选中点
  previousPointer: null,
  secondPoiner: null,
  // 连接成功的个数
  linkedCount: 0,
  /**
   * 在消除中
   */
  // isAnimating: false,

  /**
   * 有动画
   */
  get isAnimating() {
    for (let rowIdx = 1; rowIdx < this.gameTable.length; rowIdx++) {
      for (let colIdx = 1; colIdx < this.gameTable[rowIdx].length ; colIdx++) {
        if (this.gameTable[rowIdx][colIdx].animating) {
          return true
        }
      }
    }
    return false
  },

  /**
   * 连完时间奖励的分数
   * 去掉连完的分数
   */
  get scoreTime() {
    let finalScore = 0
    if (this.linkedCount >= this.CanvasVNum * this.CanvasHNum / 2 && this.timeSpend < 26) {
      // 全部连玩了
      const timeSpend = Math.max(15, this.timeSpend) // 上限15s
      finalScore = (26 - timeSpend) * 2
    }
    return finalScore
  },
  get scoreCount() {
    let finalScore = this.linkedCount
    // for (const [linkTimes, score] of this.scoreRange) {
    //   if (this.linkedCount >= linkTimes) {
    //     finalScore = score
    //   }
    // }
    return finalScore + this.scoreTime
  },
  get score() {
    if (!this.isFinished) {
      return 0
    }
    return this.scoreCount
  },

  get timeSpendPercent() {
    if (this.timeSpend === 0) {
      return 0
    }
    return this.timeSpend / this.TimeoutMax
  },

  get gameTableVLen() {
    return this.CanvasVNum + 2
  },
  get gameTableHLen() {
    return this.CanvasHNum + 2
  },
  get gameTableTdWidth() {
    let _width = 750 / (this.gameTableHLen - 1)
    if (SizeConf.height < 600) {
      _width = 750 / (this.gameTableHLen - 0)
    }
    const pPx = 750 / SizeConf.width
    const othH = + 40 + 27 + 60 + 19;
    const boxH = _width * (this.gameTableVLen - 1) / pPx 
    if (boxH > SizeConf.bodyHeight) {
      // 需要缩小
      console.log('--need resize--')
      _width = (SizeConf.bodyHeight - othH) * pPx / (this.gameTableVLen - 1)
    }
    // console.log('--boxH-', _width, boxH)
    return _width
  },

  // 做一点数据合并，
  get showGameTabe() {
    return this.gameTable.map((row, rowIdx) => {
      return row.map((col, colIdx) => {
        let selected = false
        if (this.previousPointer) {
          selected = this.previousPointer.rowIdx === rowIdx && this.previousPointer.colIdx === colIdx
        }
        if (this.secondPoiner && !selected) {
          selected = this.secondPoiner.rowIdx === rowIdx && this.secondPoiner.colIdx === colIdx
        }
        let extraClasses = ''

        if (colIdx === 0 || colIdx === row.length - 1) {
          extraClasses += ' half-width'
        }
        if (selected) {
          extraClasses += ' is-selected'
        }
        if (col.isEmpty) {
          extraClasses += ' is-empty'
        }
        if (rowIdx === this.gameTable.length - 2) {
          extraClasses += ' is-tr-end'
        }
        if (colIdx === row.length - 2) {
          extraClasses += ' is-td-end'
        }
        if (col.linkTime) {
          extraClasses += ` is-linked cm-${col.linkTime}`
          if (typeof col.linkInfo === 'object') {
            const { hasUpSibling,
              hasDownSibling,
              hasRightSibling,
              hasLeftSibling } = col.linkInfo;
            extraClasses += ' ' + (hasUpSibling ? 'link-up' : '');
            extraClasses += ' ' + (hasDownSibling ? 'link-down' : '');
            extraClasses += ' ' + (hasRightSibling ? 'link-right' : '');
            extraClasses += ' ' + (hasLeftSibling ? 'link-left' : '');
          }
          if (!col.animating) {
            extraClasses += ' animated'
          }
        }
        if (col.linkedPointer) {
          extraClasses += ' is-linked-pointer'
        }
        if (col.animating) {
          extraClasses += ' is-animating'
        }
        return {
          ...col,
          selected,
          extraClasses,
          halfWidth: colIdx === 0 || colIdx === row.length - 1,
          halfHeight: rowIdx === 0 || rowIdx === this.gameTable.length - 1
        }
      })
    })
  },
  get gameIsFinishedByLink() {
    for (let rowIdx = 1; rowIdx < this.gameTable.length - 1; rowIdx++) {
      for (let colIdx = 1; colIdx < this.gameTable[rowIdx].length - 1; colIdx++) {
        if (this.gameTable[rowIdx][colIdx].show) {
          return false
        }
      }
    }
    return true
  },
  get isFinished() {
    return (this.timeSpend >= this.TimeoutMax || this.gameIsFinishedByLink) && this.timeSpend > 0
  },
  cleanTimer: action(function () {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer)
      this.currentTimer = null
    }
  }),
  addTime: action(function () {
    if (!this.isPausing) {
      this.timeSpend++;
      if (this.timeSpend >= this.TimeoutMax) {
        this.cleanTimer()
      }
    }
  }),
  // 暂停游戏
  pauseGame: action(function () {
    this.isPausing = true
  }),
  // 恢复游戏
  resumeGame: action(function () {
    this.isPausing = false
  }),
  // 停止游戏
  stopGame: action(function () {
    this.cleanTimer()
    this.gameTable = [];
    this.previousPointer = null
    this.secondPoiner = null
    this.timeSpend = 0
    this.currentTimer = null
    // 是否暂停游戏
    this.isPausing = false
    this.linkedCount = 0
  }),
  // 创建棋盘
  createTable: action(function ({colors = [],playNext = false} = {}) {
    console.log('--createTable---',colors)
    if(Array.isArray(colors) &&  colors.length) {
      // 需要连的点 {value,sameCode}[]
      const Pointers = [];
      for (let i = 0; i < colors.length; i++) {
        Pointers.push({
          value: colors[i],
          sameCode: i + 1
        })
      }
      this.Pointers = Pointers
    }
    let _rList = []
    if (this.CanvasVNum * this.CanvasHNum % 2 !== 0) {
      // 棋盘数必须是偶数
      throw new Error("棋盘数必须是偶数")
    }
    if (this.gameTable.length > 0 && !playNext) {
      // 洗牌
      this.previousPointer = null
      this.secondPoiner = null
      for (let rowIdx = 1; rowIdx < this.gameTable.length - 1; rowIdx++) {
        for (let colIdx = 1; colIdx < this.gameTable[rowIdx].length - 1; colIdx++) {
          _rList.push({
            value: this.gameTable[rowIdx][colIdx].value,
            sameCode: this.gameTable[rowIdx][colIdx].sameCode,
            hide: !!(this.gameTable[rowIdx][colIdx].isEmpty || !this.gameTable[rowIdx][colIdx].show)
          })
        }
      }
    } else {
      // 重新开始
      let i = 0
      while (_rList.length < this.CanvasVNum * this.CanvasHNum) {
        _rList.push({
          ...this.Pointers[i]
        })
        _rList.push({
          ...this.Pointers[i]
        })
        i++
        if (i === this.Pointers.length - 1) {
          i = 0
        }
      }
    }

    if (this.gameTable.length === 0 || playNext) {
      // 新开一局
      this.stopGame()
      this.currentTimer = setInterval(() => {
        this.addTime();
      }, 1000)
    }

    this.gameTable = []
    _rList = shuffle(_rList)
    this.gameTable.push(new Array(this.CanvasHNum + 2).fill({ isEmpty: true })) // 空行
    for (let i = 0; i < this.CanvasVNum; i++) {
      const list = []
      list.push({ isEmpty: true })
      for (let i = 0; i < this.CanvasHNum; i++) {
        // TODO: 优化
        const item = _rList.pop()
        list.push({
          ...item,
          show: !item.hide,
          isEmpty: item.hide
        })
      }
      list.push({ isEmpty: true })
      this.gameTable.push(list)
    }
    this.gameTable.push(new Array(this.CanvasHNum + 2).fill({ isEmpty: true })) // 空行
  }),

  // 获取节点周边空白的节点
  _getPinterEmptyIndex({ rowIdx, colIdx }) {
    const vUpList = [{ rowIdx, colIdx }]
    const vDownList = [{ rowIdx, colIdx }]
    const hRightList = [{ rowIdx, colIdx }]
    const hLeftList = [{ rowIdx, colIdx }]
    if (this.gameTable.length === 0) {
      return { vUpList, vDownList, hRightList, hLeftList }
    }

    // up
    let _rowUpIdx = rowIdx - 1
    while (_rowUpIdx >= 0 && _rowUpIdx < this.gameTable.length) {
      if (this.gameTable[_rowUpIdx][colIdx].show) {
        break
      }
      vUpList.unshift({
        rowIdx: _rowUpIdx, colIdx
      })
      _rowUpIdx -= 1
    }
    // down
    let _rowDownIdx = rowIdx + 1
    while (_rowDownIdx >= 0 && _rowDownIdx < this.gameTable.length) {
      if (this.gameTable[_rowDownIdx][colIdx].show) {
        break
      }
      vDownList.push({
        rowIdx: _rowDownIdx, colIdx
      })
      _rowDownIdx += 1
    }

    // right
    let _colRightIdx = colIdx + 1
    while (_colRightIdx >= 0 && _colRightIdx < this.gameTable[0].length) {
      if (this.gameTable[rowIdx][_colRightIdx].show) {
        break
      }
      hRightList.push({
        rowIdx, colIdx: _colRightIdx
      })
      _colRightIdx += 1
    }
    // left
    let _colLeftIdx = colIdx - 1
    while (_colLeftIdx >= 0 && _colLeftIdx < this.gameTable[0].length) {
      if (this.gameTable[rowIdx][_colLeftIdx].show) {
        break
      }
      hLeftList.unshift({
        rowIdx, colIdx: _colLeftIdx
      })
      _colLeftIdx -= 1
    }

    return { vUpList, vDownList, hRightList, hLeftList }
  },
  /**
   * 获取连接线
   */
  _findLinkPointers({ preList, secondList, idx, direction }) {
    const _colMin = Math.min(preList.first.colIdx, secondList.first.colIdx)
    const _colMax = Math.max(preList.first.colIdx, secondList.first.colIdx)
    const _rowMin = Math.min(preList.first.rowIdx, secondList.first.rowIdx)
    const _rowMax = Math.max(preList.first.rowIdx, secondList.first.rowIdx)

    if (['upToDown', 'downToUp', 'up', 'down'].includes(direction)) {
      let list = [];
      if (direction === 'up') {
        list = preList
          .filter(item => item.rowIdx >= idx)
          .concat(secondList.filter(item => item.rowIdx >= idx))
      } else if (direction === 'down') {
        list = preList
          .filter(item => item.rowIdx <= idx)
          .concat(secondList.filter(item => item.rowIdx <= idx))
      } else if (direction === 'upToDown') {
        list = preList
          .filter(item => item.rowIdx >= idx)
          .concat(secondList.filter(item => item.rowIdx <= idx))
      } else if (direction === 'downToUp') {
        list = preList
          .filter(item => item.rowIdx <= idx)
          .concat(secondList.filter(item => item.rowIdx >= idx))
      }
      let _colIdx = _colMin + 1
      while (_colIdx < _colMax) {
        list.push({
          rowIdx: idx,
          colIdx: _colIdx
        })
        _colIdx += 1
      }
      return list
    } else if (['leftToRight', 'rightToLeft', 'left', 'right'].includes(direction)) {
      let list = []
      if (direction === 'right') {
        list = preList
          .filter(item => item.colIdx <= idx)
          .concat(secondList.filter(item => item.colIdx <= idx))
      } else if (direction === 'left') {
        list = preList
          .filter(item => item.colIdx >= idx)
          .concat(secondList.filter(item => item.colIdx >= idx))
      } else if (direction === 'leftToRight') {
        list = preList
          .filter(item => item.colIdx >= idx)
          .concat(secondList.filter(item => item.colIdx <= idx))
      } else if (direction === 'rightToLeft') {
        list = preList
          .filter(item => item.colIdx <= idx)
          .concat(secondList.filter(item => item.colIdx >= idx))
      }
      let _rowIdx = _rowMin + 1
      while (_rowIdx < _rowMax) {
        list.push({
          rowIdx: _rowIdx,
          colIdx: idx
        })
        _rowIdx += 1
      }
      return list
    }
    return []
  },
  /**
   * 找到能够连接的 路线
   */
  _tryFindLinkPointers(previousPointer, secondPoiner) {
    const preEmptyIdxs = this._getPinterEmptyIndex(previousPointer || this.previousPointer)
    const secondEmpthIdxs = this._getPinterEmptyIndex(secondPoiner || this.secondPoiner)

    console.log('---_getPinterEmptyIndex---', preEmptyIdxs, secondEmpthIdxs)

    /**
     * up or down              up       down
     * |                |     ____     |   |
     * -----   or   -----  or |  |  or |   |
     *     |        |         |  |     |___|
     * has common row idx
     */
    for (const [pVList, sVList, direction] of [
      [preEmptyIdxs.vUpList, secondEmpthIdxs.vUpList, 'up'],
      [preEmptyIdxs.vDownList, secondEmpthIdxs.vDownList, 'down'],
      [preEmptyIdxs.vUpList, secondEmpthIdxs.vDownList, 'upToDown'],
      [preEmptyIdxs.vDownList, secondEmpthIdxs.vUpList, 'downToUp']]) {
      const commonRowIdxs = pVList.reduce((pre, cur) => {
        if (sVList.find(item => item.rowIdx === cur.rowIdx)) {
          pre.push(cur.rowIdx)
        }
        return pre
      }, [])
        .sort((a, b) => {
          if (direction === 'up') {
            return b - a
          }
          return a - b
        });
      // console.log('--commonRowIdxs--',direction, commonRowIdxs)
      if (commonRowIdxs.length > 0) {
        const _colMin = Math.min(pVList.first.colIdx, sVList.first.colIdx)
        const _colMax = Math.max(pVList.first.colIdx, sVList.first.colIdx)
        let _closetLinkRowIdx = -1
        loop: for (const rowIdx of commonRowIdxs) {
          let _colIdx = _colMin + 1
          while (_colIdx < _colMax) {
            console.log('--ss', rowIdx, _colIdx, { ...this.gameTable[rowIdx][_colIdx] })
            if (this.gameTable[rowIdx][_colIdx].show) {
              continue loop
            }
            _colIdx += 1
          }
          _closetLinkRowIdx = rowIdx
          break
        }
        if (_closetLinkRowIdx >= 0) {
          console.log(`!!!!has link ${direction} !!!!`, _closetLinkRowIdx)
          return this._findLinkPointers({
            preList: pVList,
            secondList: sVList,
            idx: _closetLinkRowIdx,
            direction
          });
        }
      }
    }

    /**
     * left or right              left    right
     * ---             ---       ____      ___
     *    |      or    |     or |      or     |
     *    ---        ---        |____      ___|
     * has common row idx
     */
    for (const [pHList, sHList, direction] of [
      [preEmptyIdxs.hLeftList, secondEmpthIdxs.hLeftList, 'left'],
      [preEmptyIdxs.hRightList, secondEmpthIdxs.hRightList, 'right'],
      [preEmptyIdxs.hLeftList, secondEmpthIdxs.hRightList, 'leftToRight'],
      [preEmptyIdxs.hRightList, secondEmpthIdxs.hLeftList, 'rightToLeft']]) {

      const commonColIdxs = pHList.reduce((pre, cur) => {
        if (sHList.find(item => item.colIdx === cur.colIdx)) {
          pre.push(cur.colIdx)
        }
        return pre
      }, [])
        .sort((a, b) => {
          if (direction === 'left') {
            return b - a
          }
          return a - b
        });
      if (commonColIdxs.length > 0) {
        const _rowMin = Math.min(pHList.first.rowIdx, sHList.first.rowIdx)
        const _rowMax = Math.max(pHList.first.rowIdx, sHList.first.rowIdx)
        let _closetLinkColIdx = -1
        loop: for (const colIdx of commonColIdxs) {
          let _rowIdx = _rowMin + 1
          while (_rowIdx < _rowMax) {
            if (this.gameTable[_rowIdx][colIdx].show) {
              continue loop
            }
            _rowIdx += 1
          }
          _closetLinkColIdx = colIdx
          break
        }
        if (_closetLinkColIdx >= 0) {
          console.log(`!!!!has link ${direction} !!!!`, _closetLinkColIdx)
          return this._findLinkPointers({
            preList: pHList,
            secondList: sHList,
            idx: _closetLinkColIdx,
            direction
          });
        }

      }
    }
    return []
  },

  // 选中节点
  choosePointer: action(function ({ rowIdx, colIdx }, callback) {
    if (this.gameTable[rowIdx][colIdx].isEmpty || !this.gameTable[rowIdx][colIdx].show) {
      console.log('--empty pointer')
      return
    }
    if (!this.previousPointer) {
      this.previousPointer = { rowIdx, colIdx }
      this.secondPoiner = null
      return
    }
    const { rowIdx: preRowIdx, colIdx: preColIdx } = this.previousPointer;
    if (preRowIdx === rowIdx && preColIdx === colIdx) {
      // 点击的同一个，取消选中
      this.previousPointer = null
      return
    }
    if (this.gameTable[preRowIdx][preColIdx].sameCode !== this.gameTable[rowIdx][colIdx].sameCode) {
      this.previousPointer = { rowIdx, colIdx }
      this.secondPoiner = null
      return
    }
    this.secondPoiner = { rowIdx, colIdx }

    let linkedPointers = this._tryFindLinkPointers()
    if (linkedPointers.length === 0) {
      console.log('no way to link')
      this.previousPointer = { rowIdx, colIdx }
      this.secondPoiner = null
      return
    }

    this.previousPointer = null
    this.secondPoiner = null
    // console.log('---linkedPointers---', linkedPointers)
    // 算出连线规则
    linkedPointers = linkedPointers.map(item => {
      const hasUpSibling = !!linkedPointers.find(_item => _item.rowIdx + 1 === item.rowIdx && _item.colIdx === item.colIdx)
      const hasDownSibling = !!linkedPointers.find(_item => _item.rowIdx - 1 === item.rowIdx && _item.colIdx === item.colIdx)
      const hasRightSibling = !!linkedPointers.find(_item => _item.colIdx - 1 === item.colIdx && _item.rowIdx === item.rowIdx)
      const hasLeftSibling = !!linkedPointers.find(_item => _item.colIdx + 1 === item.colIdx && _item.rowIdx === item.rowIdx)
      return {
        ...item,
        hasUpSibling,
        hasDownSibling,
        hasRightSibling,
        hasLeftSibling
      }
    })
    const time = new Date().getTime()
    for (const { rowIdx, colIdx, ...linkInfo } of linkedPointers) {
      if (this.gameTable[rowIdx][colIdx].linkTime && this.gameTable[rowIdx][colIdx].animating) {
        continue
      }
      this.gameTable[rowIdx][colIdx].linkTime = time
      this.gameTable[rowIdx][colIdx].show = false
      this.gameTable[rowIdx][colIdx].animating = true
      this.gameTable[rowIdx][colIdx].linkInfo = linkInfo
    }
    this.gameTable[preRowIdx][preColIdx].linkedPointer = true
    this.gameTable[rowIdx][colIdx].linkedPointer = true
    // TODO: 棋盘中单独的数字，也可以消除？
    this.linkedCount++
    callback(time)
  }),
  emptyPointers: action(function (cmSt) {
    for (let rowIdx = 0; rowIdx < this.gameTable.length; rowIdx++) {
      for (let colIdx = 0; colIdx < this.gameTable[rowIdx].length; colIdx++) {
        if (this.gameTable[rowIdx][colIdx].linkTime === cmSt) {
          this.gameTable[rowIdx][colIdx] = {
            ...this.gameTable[rowIdx][colIdx],
            isEmpty: true, // TOOD: 和 show 重复
            show: false,
            animating: false,
            linkedPointer: false
          }
        }
      }
    }
    const canLink = this.help()
    if (!canLink && !this.gameIsFinishedByLink) {
      wx.showToast({
        title: '貌似死局了，请洗牌',
      })
    }
  }),
  /**
   * 自动找到可以连接的点
   */
  help: action(function (callback) {
    let hasLink = false;
    loop: for (let rowIdx = 1; rowIdx < this.gameTable.length - 1; rowIdx++) {
      for (let colIdx = 1; colIdx < this.gameTable[rowIdx].length - 1; colIdx++) {
        const first = { rowIdx, colIdx }
        for (let _rowIdx = rowIdx; _rowIdx < this.gameTable.length - 1; _rowIdx++) {
          for (let _colIdx = (_rowIdx === rowIdx ? colIdx + 1 : 1); _colIdx < this.gameTable[_rowIdx].length - 1; _colIdx++) {
            const second = { rowIdx: _rowIdx, colIdx: _colIdx }
            // console.log('--01', { ...first }, this.gameTable[rowIdx][colIdx].value)
            // console.log('---02', { ...second }, this.gameTable[_rowIdx][_colIdx].value)
            if (!this.gameTable[rowIdx][colIdx].show ||
              this.gameTable[rowIdx][colIdx].isEmpty ||
              !this.gameTable[_rowIdx][_colIdx].show ||
              this.gameTable[_rowIdx][_colIdx].isEmpty) {
              continue
            }
            if (this.gameTable[rowIdx][colIdx].sameCode !== this.gameTable[_rowIdx][_colIdx].sameCode) {
              continue
            }
            // console.log('01', { ...first }, this.gameTable[rowIdx][colIdx].value)
            // console.log('02', { ...second }, this.gameTable[_rowIdx][_colIdx].value)
            let linkedPointers = this._tryFindLinkPointers(first, second)
            if (linkedPointers.length > 0) {
              // console.log('111--1', linkedPointers)
              if (typeof callback === 'function') {
                this.previousPointer = first
                this.secondPoiner = null
                callback(second)
              }

              hasLink = true
              break loop
            }
          }
        }
      }
    }
    if (!hasLink) {
      console.log('死局!!!')
    }
    return hasLink
  })
})

autorun(() => {
  // console.log('--test autorun--', store.gameTable.length)
  if (store.gameIsFinishedByLink) {
    // 超时之前连玩了
    if (store.currentTimer) {
      store.cleanTimer()
    }
  }
})