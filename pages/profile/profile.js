Page({
  data: {
    knownCount: 0,
    streak: 0,
    todayCount: 0,
    lessonText: '',
    dueCount: 0,
    notice: '',
    inputCountdown: '',
    showInputCountdown: false
  },

  onShow: function () {
    var storageModule = require('../../utils/storage.js');
    var course = require('../../data/course.js');
    var appData = require('../../utils/app-data.js');
    var srs = require('../../utils/srs.js');
    var store = storageModule.createStorage({
      get: function (key) { return wx.getStorageSync(key); },
      set: function (key, value) { wx.setStorageSync(key, value); }
    });
    var state = store.load().state;
    var lesson = appData.getCurrentLessonInfo(state, course);
    var todayCards = appData.getTodayCards(state, course, Date.now());

    this.setData({
      knownCount: Object.keys(state.progress).length,
      streak: state.stats.streak,
      todayCount: todayCards.length,
      lessonText: lesson.isCustom ? lesson.title : '第 ' + lesson.number + ' 课　' + lesson.title,
      dueCount: srs.getDueKeys(state.progress, Date.now()).length,
      notice: ''
    });
  },

  onTodayTap: function () {
    this.goTo('/pages/index/index', '今天页面暂时打不开，请再试一次');
  },

  onReviewTap: function () {
    this.goTo('/pages/review/review', '复习页面暂时打不开，请再试一次');
  },

  onProfileTap: function () {
    this.setData({ notice: '已经在我的页面' });
  },

  goTo: function (url, message) {
    var that = this;
    wx.redirectTo({
      url: url,
      fail: function () { that.setData({ notice: message }); }
    });
  },

  onInputTouchStart: function () {
    var that = this;
    var remaining = 3;
    this.clearInputTimer();
    this.setData({ inputCountdown: '3', showInputCountdown: true });
    this.inputCountdownTimer = setInterval(function () {
      remaining -= 1;
      if (remaining >= 1) {
        that.setData({ inputCountdown: String(remaining) });
      }
    }, 1000);
    this.inputTimer = setTimeout(function () {
      that.clearInputTimer();
      wx.navigateTo({
        url: '/pages/input/input',
        fail: function () { that.setData({ notice: '录入页面暂时打不开，请再试一次' }); }
      });
    }, 3000);
  },

  onInputTouchEnd: function () {
    this.clearInputTimer();
  },

  clearInputTimer: function () {
    if (this.inputTimer) {
      clearTimeout(this.inputTimer);
      this.inputTimer = null;
    }
    if (this.inputCountdownTimer) {
      clearInterval(this.inputCountdownTimer);
      this.inputCountdownTimer = null;
    }
    if (this.data.showInputCountdown || this.data.inputCountdown) {
      this.setData({ inputCountdown: '', showInputCountdown: false });
    }
  },

  onUnload: function () {
    this.clearInputTimer();
  }
});
