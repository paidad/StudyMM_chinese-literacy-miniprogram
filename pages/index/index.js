Page({
  data: {
    preview: { char: '', pinyin: '' },
    progressDots: [],
    todayCount: 0,
    knownCount: 0,
    isEmpty: false,
    notice: '',
    storageNotice: '',
    inputNavLabel: '录入'
  },

  onShow: function () {
    var course = require('../../data/course.js');
    var appData = require('../../utils/app-data.js');
    var storageModule = require('../../utils/storage.js');
    var speechData = require('../../utils/speech-data.js');
    var pinyinMap = require('../../data/pinyin.js');
    var loadResult;
    var cards;

    this.course = course;
    this.appData = appData;
    this.speechData = speechData;
    this.pinyinMap = pinyinMap;
    this.localStore = storageModule.createStorage({
      get: function (key) {
        return wx.getStorageSync(key);
      },
      set: function (key, value) {
        wx.setStorageSync(key, value);
      }
    });
    loadResult = this.localStore.load();
    this.localState = loadResult.state;
    cards = appData.getTodayCards(this.localState, course, Date.now());
    this.todayCards = cards;

    this.setData({
      preview: cards[0] || { char: '好', pinyin: 'hǎo' },
      progressDots: cards.map(function (item, index) {
        return { id: item.char + index, state: index === 0 ? 'current' : 'waiting' };
      }),
      todayCount: cards.length,
      knownCount: Object.keys(this.localState.progress).length,
      isEmpty: cards.length === 0,
      storageNotice: loadResult.ok ? '' : '手机暂时读不到记录，关掉后可能会丢失',
      notice: ''
    });
  },

  onWordTap: function () {
    var savedPath;
    var sources;
    var card;
    var map;
    var that = this;
    var audioPlayerModule;

    if (!this.todayCards || this.todayCards.length === 0) {
      return;
    }
    card = this.todayCards[0];
    savedPath = this.localState.recordings[card.char];
    if (savedPath) {
      sources = [savedPath];
    } else {
      map = this.pinyinMap;
      if (card.char.length === 1 && card.pinyin) {
        map = {};
        map[card.char] = card.pinyin;
      }
      sources = this.speechData.textToSyllableSources(card.char, map);
    }
    if (!sources.length) {
      this.setData({ notice: '还没有声音，请家人录一遍' });
      return;
    }

    this.destroyAudioPlayer();
    audioPlayerModule = require('../../utils/sequence-audio-player.js');
    this.audioPlayer = audioPlayerModule.createSequenceAudioPlayer(function () {
      return wx.createInnerAudioContext();
    });
    this.audioPlayer.play(sources, {
      onPlay: function () {
        that.setData({ notice: '正在读“' + that.todayCards[0].char + '”' });
      },
      onEnded: function () {
        that.setData({ notice: '读完了' });
      },
      onError: function () {
        that.setData({ notice: '声音没有播出来，请再试一次' });
      }
    });
  },

  onStartTap: function () {
    var that = this;

    if (!this.todayCards || this.todayCards.length === 0) {
      this.setData({ notice: '内置课程已经学完了，可以让家人安排新内容' });
      return;
    }
    wx.navigateTo({
      url: '/study/pages/learn/learn?mode=today',
      fail: function () {
        that.setData({ notice: '学习页面暂时打不开，请再试一次' });
      }
    });
  },

  onTodayTap: function () {
    this.setData({ notice: '已经在今天页面' });
  },

  onReviewTap: function () {
    this.goTo('/pages/review/review', '复习页面暂时打不开，请再试一次');
  },

  onProfileTap: function () {
    this.goTo('/pages/profile/profile', '我的页面暂时打不开，请再试一次');
  },

  goTo: function (url, failureMessage) {
    var that = this;
    this.destroyAudioPlayer();
    wx.redirectTo({
      url: url,
      fail: function () {
        that.setData({ notice: failureMessage });
      }
    });
  },

  onInputTouchStart: function () {
    var that = this;
    var remaining = 3;
    this.clearInputTimer();
    this.setData({ inputNavLabel: '3' });
    this.inputCountdownTimer = setInterval(function () {
      remaining -= 1;
      if (remaining >= 1) {
        that.setData({ inputNavLabel: String(remaining) });
      }
    }, 1000);
    this.inputTimer = setTimeout(function () {
      that.clearInputTimer();
      that.destroyAudioPlayer();
      wx.navigateTo({
        url: '/pages/input/input',
        fail: function () {
          that.setData({ notice: '录入页面暂时打不开，请再试一次' });
        }
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
    if (this.data.inputNavLabel !== '录入') {
      this.setData({ inputNavLabel: '录入' });
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
