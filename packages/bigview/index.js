'use strict'

const debug = require('debug')('bigview')
const fs = require('fs')

module.exports = class BigView {
  constructor (req, res, layout, data) {
    this.req = req
    this.res = res
    this.layout = layout
    this.data = data
    this.previewFile = 'bigview.html'
    this.isMock = false
    this.pagelets = []
    this.allPagelets = []
    this.done = false
    this.layoutHtml = ''
    this.chunks = []
    this.js = ''
    this.css = ''
    
    if (req.query) this.query = req.query
    if (req.params) this.params = req.params
    if (req.body) this.body = req.body

    return this
  }

 /**
  * Write data to Browser.
  *
  * @api public
  */
  write (text) {
    if (this.done === true) return

    let self = this

    return new Promise(function (resolve, reject) {
      debug('BigView final data = ' + text)
      debug(text)
      if (text && text.length > 0 ) {
        // save to chunks array for preview
        self.setPageletChunk(text)

        // write to Browser
        self.res.write(text)
      }
    })
  }
  
  setPageletChunk (text) {
    if (this.chunks.length < 1) {
      return this.chunks.push(text)
    }

    let pagelet = this.allPagelets[this.chunks.length-1]
    debug(pagelet)

    let comment = `<!--这是${pagelet.name}-->`
    let _t =  comment + '\n' + text
    this.chunks.push(_t)
  }

  compile (tpl, data) {
    let self = this
    return new Promise(function (resolve, reject) {
      debug('renderLayout')
      self.res.render(tpl, data, function (err, str) {
        if (err) {
          debug('renderLayout ' + str)
          console.log(err)
        }
        debug(str)
        self.write(str)
        resolve(str)
      })
    })
  }
  
  add (pagelet) {
    pagelet.owner = this

    let self = this
    this.pagelets.push(pagelet)

    var re = []
    // 递归实现深度遍历，这是由于pagelet有子pagelet的原因
    function getPagelets (pagelet) {
      re.push(pagelet)
      var a = []
      if (pagelet.children) {
        for(let i in pagelet.children){
          let p = pagelet.children[i]
          p.parent = pagelet.name
          re.push(p)

          if (p.children && p.children.length > 0) {
            getPagelets (p) 
          }
        }
      }
    }

    getPagelets(pagelet)

    for(let i in re) {
      let _pagelet = re[i]
      this.allPagelets.push(_pagelet)
    }
    debug(this.allPagelets)
  }

  fetchAllData (){
    debug("BigView  fetchAllData start")
    let self = this
    
    let q = []
    for(var i in self.pagelets){
      let _pagelet = self.pagelets[i]
      q.push(_pagelet._exec())
    }
    
    return Promise.all(q)
      // .then(function(){
      //   console.log('BigView fetchAllData end')
      // })
  }

  start () {
    debug('BigView start')
    let self = this

    // 1) this.before
    // 2）渲染布局
    // 3）Promise.all() 并行处理pagelets（策略是随机，fetch快的优先）
    // 4）this.end 通知浏览器，写入完成
  
    return this.before()
      .then(this.renderLayout.bind(this))
      .then(this.fetchAllData.bind(this))
      .then(this.end.bind(this))
      .catch(this.processError.bind(this))
  }
  
  end (time) {
    let t
    if (!time) {
      t = 0
    } else {
      t = time
    }
    
    if (this.done === true) return
    debug("BigView end")
    let self = this
    
    // lifecycle after
    self.after()

    return new Promise(function (resolve, reject) {
      setTimeout(function(){
        self.res.end()
        self.done = true
        resolve(true)
      }, t)
    })
  }
  
  renderLayout () {
    debug("BigView renderLayout")
    let self = this
    self.data = self.getData(self.data, self.pagelets)
    return self.compile(self.layout, self.data).then(function(str){
      self.layoutHtml = str
      return Promise.resolve(true)
    })
  }

  /**
  * 子类重写此方法，可以自定义
  *
  * @api public
  */

  getData (data, pagelets) {
    let self = this

    self.data.pagelets = pagelets ? pagelets : self.pagelets
    
    return self.data
  }
  
  loadData () {
    throw new Error('need impl')
  }
  
  processError (err) {
    return new Promise(function(resolve, reject) {
      console.log(err)
      resolve(true)
    })
  }

  before () {
    return new Promise(function(resolve, reject) {
      debug('default before')
      resolve(true)
    })
  }

  out () {
    if (this.isMock && this.previewFile) {
      fs.writeFileSync(this.previewFile, this.chunks.join('\n'))

      let _d = this.data
      delete _d.pagelets;

      var _a = []

      for(let i in this.allPagelets) {
        let _p = this.allPagelets[i]
        delete _p.owner
        _a.push(_p)
      }

      let d = {
        layout: this.layout,
        layoutHtml: this.layoutHtml,
        data: _d,
        // pagelets: this.pagelets,
        allPagelets: _a,
        chunks: this.chunks
      }
      
      var CircularJSON = require('circular-json')
      var str = CircularJSON.stringify(d);
      var o = JSON.parse(str)
      fs.writeFileSync(this.previewFile + '.json', JSON.stringify(d, null, 4))

    }
  }

  preview (f) {
    this.previewFile = f
  }

  after () {
    debug('default after')
    
    this.out()
  }
}
