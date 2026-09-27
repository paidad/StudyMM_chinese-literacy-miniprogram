Page({
  data: {
    char: '',
    hasStrokeData: false,
    showTrace: false,
    status: ''
  },

  onLoad: function (options) {
    var strokes = require('../../data/strokes.js');
    var strokeGeometry = require('../../utils/stroke-geometry.js');
    var char = options && options.char ? decodeURIComponent(options.char) : '';
    this.strokeList = strokes[char] || [];
    this.strokeGeometry = strokeGeometry;
    this.referenceCanvasSize = 300;
    this.traceCanvasSize = 300;
    this.referenceTransform = this.strokeList.length > 0 ? strokeGeometry.createTransform(this.strokeList, 300, 28) : null;
    this.traceTransform = this.referenceTransform;
    this.setData({
      char: char,
      hasStrokeData: this.strokeList.length > 0,
      status: this.strokeList.length > 0 ? '点“再放一遍”看笔顺' : '这个字还没有笔顺动画，可以在下面照着写'
    });
  },

  onReady: function () {
    this.animationContext = wx.createCanvasContext('strokeCanvas', this);
    this.traceContext = wx.createCanvasContext('traceCanvas', this);
    this.measureCanvases(function () {
      if (this.strokeList.length > 0) {
        this.playAnimation();
      } else {
        this.drawGrid(this.animationContext, false, this.referenceCanvasSize);
      }
    });
  },

  measureCanvases: function (callback) {
    var that = this;
    var query;
    if (!wx.createSelectorQuery) {
      callback.call(this);
      return;
    }
    query = wx.createSelectorQuery();
    query.in(this);
    query.select('#strokeCanvasView').boundingClientRect();
    query.select('#traceCanvasView').boundingClientRect();
    query.exec(function (results) {
      var referenceRect = results && results[0];
      var traceRect = results && results[1];
      if (referenceRect && referenceRect.width > 0) {
        that.referenceCanvasSize = Math.min(referenceRect.width, referenceRect.height);
        that.referenceTransform = that.strokeList.length > 0 ? that.strokeGeometry.createTransform(
          that.strokeList,
          that.referenceCanvasSize,
          that.referenceCanvasSize * 0.09
        ) : null;
      }
      if (traceRect && traceRect.width > 0) {
        that.traceCanvasSize = Math.min(traceRect.width, traceRect.height);
        that.traceTransform = that.strokeList.length > 0 ? that.strokeGeometry.createTransform(
          that.strokeList,
          that.traceCanvasSize,
          that.traceCanvasSize * 0.09
        ) : null;
      }
      callback.call(that);
    });
  },

  drawGrid: function (context, preserve, size) {
    var canvasSize = size || 300;
    context.setFillStyle('#ffffff');
    context.fillRect(0, 0, canvasSize, canvasSize);
    context.setStrokeStyle('#d8cbbb');
    context.setLineWidth(1);
    context.beginPath();
    context.moveTo(canvasSize / 2, 0);
    context.lineTo(canvasSize / 2, canvasSize);
    context.moveTo(0, canvasSize / 2);
    context.lineTo(canvasSize, canvasSize / 2);
    context.stroke();
    context.draw(preserve);
  },

  onReplayTap: function () {
    var that = this;
    if (this.strokeList.length === 0) {
      this.setData({ status: '这个字还没有笔顺动画，可以在下面照着写' });
      return;
    }
    this.setData({ showTrace: false }, function () {
      that.playAnimation();
    });
  },

  onTraceModeTap: function () {
    var that = this;
    this.clearAnimationTimer();
    this.setData({ showTrace: true, status: '点上面的字重放，再在下面描一遍' }, function () {
      that.measureCanvases(function () {
        that.drawCompleteReference();
        that.drawGrid(that.traceContext, false, that.traceCanvasSize);
        that.drawTraceGuide();
      });
    });
  },

  onReferenceTap: function () {
    if (this.data.showTrace && this.strokeList.length > 0) {
      this.playAnimation();
    }
  },

  drawCompleteReference: function () {
    var that = this;
    this.drawGrid(this.animationContext, false, this.referenceCanvasSize);
    this.animationContext.setStrokeStyle('#a63e0c');
    this.animationContext.setLineWidth(Math.max(5, this.referenceCanvasSize * 0.04));
    this.animationContext.setLineCap('round');
    this.animationContext.setLineJoin('round');
    this.strokeList.forEach(function (stroke) {
      var points = that.strokeGeometry.expandStroke(stroke, that.referenceTransform, 7);
      var index;
      if (points.length < 2) { return; }
      that.animationContext.beginPath();
      that.animationContext.moveTo(points[0][0], points[0][1]);
      for (index = 1; index < points.length; index += 1) {
        that.animationContext.lineTo(points[index][0], points[index][1]);
      }
      that.animationContext.stroke();
    });
    this.animationContext.draw(true);
  },

  drawTraceGuide: function () {
    var that = this;
    if (!this.traceTransform || !this.traceContext) { return; }
    this.traceContext.setStrokeStyle('#dfcdb8');
    this.traceContext.setLineWidth(Math.max(8, this.traceCanvasSize * 0.035));
    this.traceContext.setLineCap('round');
    this.traceContext.setLineJoin('round');
    this.strokeList.forEach(function (stroke) {
      var points = that.strokeGeometry.expandStroke(stroke, that.traceTransform, 7);
      var index;
      if (points.length < 2) { return; }
      that.traceContext.beginPath();
      that.traceContext.moveTo(points[0][0], points[0][1]);
      for (index = 1; index < points.length; index += 1) {
        that.traceContext.lineTo(points[index][0], points[index][1]);
      }
      that.traceContext.stroke();
    });
    this.traceContext.draw(true);
  },

  playAnimation: function () {
    var that = this;
    this.clearAnimationTimer();
    this.drawGrid(this.animationContext, false, this.referenceCanvasSize);
    this.strokeIndex = 0;
    this.strokePointIndex = 1;
    this.animationPoints = [];
    this.setData({ status: this.data.showTrace ? '上面的字正在一笔一笔写' : '正在一笔一笔写' });

    function drawNext() {
      var points;
      var from;
      var to;
      if (that.strokeIndex >= that.strokeList.length) {
        that.setData({
          status: that.data.showTrace ? '点上面的字重放，再在下面描一遍' : '写完了，可以再看一遍'
        });
        return;
      }
      if (that.animationPoints.length === 0) {
        that.animationPoints = that.strokeGeometry.expandStroke(
          that.strokeList[that.strokeIndex],
          that.referenceTransform,
          7
        );
        that.strokePointIndex = 1;
      }
      points = that.animationPoints;
      if (that.strokePointIndex >= points.length) {
        that.strokeIndex += 1;
        that.animationPoints = [];
        that.animationTimer = setTimeout(drawNext, 260);
        return;
      }
      from = points[that.strokePointIndex - 1];
      to = points[that.strokePointIndex];
      that.animationContext.setStrokeStyle('#a63e0c');
      that.animationContext.setLineWidth(Math.max(5, that.referenceCanvasSize * 0.04));
      that.animationContext.setLineCap('round');
      that.animationContext.setLineJoin('round');
      that.animationContext.beginPath();
      that.animationContext.moveTo(from[0], from[1]);
      that.animationContext.lineTo(to[0], to[1]);
      that.animationContext.stroke();
      that.animationContext.draw(true);
      that.strokePointIndex += 1;
      that.animationTimer = setTimeout(drawNext, 22);
    }
    this.animationTimer = setTimeout(drawNext, 250);
  },

  onTraceStart: function (event) {
    var touch = event.touches[0];
    this.lastTracePoint = { x: touch.x, y: touch.y };
  },

  onTraceMove: function (event) {
    var touch = event.touches[0];
    if (!this.lastTracePoint) {
      return;
    }
    this.traceContext.setStrokeStyle('#27633d');
    this.traceContext.setLineWidth(14);
    this.traceContext.setLineCap('round');
    this.traceContext.beginPath();
    this.traceContext.moveTo(this.lastTracePoint.x, this.lastTracePoint.y);
    this.traceContext.lineTo(touch.x, touch.y);
    this.traceContext.stroke();
    this.traceContext.draw(true);
    this.lastTracePoint = { x: touch.x, y: touch.y };
  },

  onTraceEnd: function () {
    this.lastTracePoint = null;
  },

  onEraseTap: function () {
    this.lastTracePoint = null;
    this.drawGrid(this.traceContext, false, this.traceCanvasSize);
    this.drawTraceGuide();
    this.setData({ status: '已经擦干净，可以重新写' });
  },

  onDoneTap: function () {
    var channel;
    if (this.didFinishWriting) { return; }
    this.didFinishWriting = true;
    this.setData({ status: '写好了，继续学下一个字' });
    if (this.getOpenerEventChannel) {
      channel = this.getOpenerEventChannel();
      if (channel && channel.emit) {
        channel.emit('writeDone');
      }
    }
    setTimeout(function () {
      wx.navigateBack({ delta: 1 });
    }, 260);
  },

  clearAnimationTimer: function () {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  },

  onUnload: function () {
    this.clearAnimationTimer();
  }
});
