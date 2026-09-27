Page({
  data: {
    dueCards: [],
    hasDue: false,
    notice: ''
  },

  onShow: function () {
    var storageModule = require('../../utils/storage.js');
    var course = require('../../data/course.js');
    var appData = require('../../utils/app-data.js');
    var srs = require('../../utils/srs.js');
    var speechData = require('../../utils/speech-data.js');
    var pinyinMap = require('../../data/pinyin.js');
    var that = this;
    var keys;

    this.course = course;
    this.appData = appData;
    this.speechData = speechData;
    this.pinyinMap = pinyinMap;
    this.localStore = storageModule.createStorage({
      get: function (key) { return wx.getStorageSync(key); },
      set: function (key, value) { wx.setStorageSync(key, value); }
    });
    this.localState = this.localStore.load().state;
    keys = srs.getDueKeys(this.localState.progress, Date.now());
    this.dueCardModels = keys.map(function (key) {
      return appData.getCard(that.localState, course, key);
    }).filter(function (item) { return !!item; });
    this.setData({
      dueCards: this.dueCardModels.map(function (item, index) {
        return { id: item.char + index, char: item.char, pinyin: item.pinyin, index: index };
      }),
      hasDue: this.dueCardModels.length > 0,
      notice: ''
    });
  },

  onCardTap: function (event) {
    var card = this.dueCardModels[Number(event.currentTarget.dataset.index)];
    var recording = this.localState.recordings[card.char] || '';
    var sources;
    var map = this.pinyinMap;

    if (recording) {
      sources = [recording];
    } else {
      if (card.char.length === 1 && card.pinyin) {
        map = {};
        map[card.char] = card.pinyin;
      }
      sources = this.speechData.textToSyllableSources(card.char, map);
    }
    if (!sources.length) {
      this.setData({ notice: '“' + card.char + '”还没有声音，请家人录一遍' });
      return;
    }
    this.playSources(sources, card.char);
  },

  playSources: function (sources, char) {
    var that = this;
    var audioPlayerModule = require('../../utils/sequence-audio-player.js');
    this.destroyAudioPlayer();
    this.audioPlayer = audioPlayerModule.createSequenceAudioPlayer(function () {
      return wx.createInnerAudioContext();
    });
    this.audioPlayer.play(sources, {
      onPlay: function () { that.setData({ notice: '正在读“' + char + '”' }); },
      onEnded: function () { that.setData({ notice: '' }); },
      onError: function () { that.setData({ notice: '声音没有播出来，请再试一次' }); }
    });
  },

  onStartReviewTap: function () {
    var that = this;
    if (!this.dueCardModels || this.dueCardModels.length === 0) {
      return;
    }
    this.destroyAudioPlayer();
    wx.navigateTo({
      url: '/study/pages/learn/learn?mode=review',
      fail: function () { that.setData({ notice: '复习没有开始，请再试一次' }); }
    });
  },

  onTodayTap: function () {
    this.goTo('/pages/index/index', '今天页面暂时打不开，请再试一次');
  },

  onReviewTap: function () {
    this.setData({ notice: '已经在复习页面' });
  },

  onProfileTap: function () {
    this.goTo('/pages/profile/profile', '我的页面暂时打不开，请再试一次');
  },

  goTo: function (url, message) {
    var that = this;
    this.destroyAudioPlayer();
    wx.redirectTo({
      url: url,
      fail: function () { that.setData({ notice: message }); }
    });
  },

  onInputTouchStart: function () {
    var that = this;
    this.clearInputTimer();
    this.inputTimer = setTimeout(function () {
      that.inputTimer = null;
      that.destroyAudioPlayer();
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
  },

  destroyAudioPlayer: function () {
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    }
  },

  onUnload: function () {
    this.clearInputTimer();
    this.destroyAudioPlayer();
  }
});
