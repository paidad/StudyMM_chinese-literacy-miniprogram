Page({
  data: {
    recordedItems: [],
    recordedCount: 0,
    isOrganizing: false,
    selectedCount: 0,
    notice: '',
    inputCountdown: '',
    showInputCountdown: false
  },

  onShow: function () {
    var storageModule = require('../../utils/storage.js');
    this.appData = require('../../utils/app-data.js');
    this.speechData = require('../../utils/speech-data.js');
    this.pinyinMap = require('../../data/pinyin.js');
    this.localStore = storageModule.createStorage({
      get: function (key) { return wx.getStorageSync(key); },
      set: function (key, value) { wx.setStorageSync(key, value); }
    });
    var loaded = this.localStore.load();
    this.localState = loaded.state;
    this.selectedKeys = {};
    this.destroyAudioPlayer();
    this.setData({ isOrganizing: false, selectedCount: 0, notice: loaded.ok ? '' : '手机暂时读不到记录' });
    this.refreshRecordedItems();
  },

  refreshRecordedItems: function () {
    var selected = this.selectedKeys || {};
    var cards = this.appData.getRecordedLearnedCards(this.localState);
    this.setData({
      recordedCount: cards.length,
      recordedItems: cards.map(function (card) {
        var length = card.char.length;
        return {
          char: card.char,
          pinyin: card.pinyin || '',
          sizeClass: length >= 7 ? 'recorded-text-very-long' : length >= 4 ? 'recorded-text-long' : length >= 2 ? 'recorded-text-medium' : '',
          selected: !!selected[card.char]
        };
      })
    });
  },

  onOrganizeTap: function () {
    this.destroyAudioPlayer();
    this.selectedKeys = {};
    this.setData({ isOrganizing: !this.data.isOrganizing, selectedCount: 0, notice: '' });
    this.refreshRecordedItems();
  },

  onRecordedTap: function (event) {
    var key = event.currentTarget.dataset.char;
    var card = this.localState.chars[key];
    var recording;
    var sources;
    var map;
    var that = this;
    var playerModule;
    if (!card) { return; }
    if (this.data.isOrganizing) {
      if (this.selectedKeys[key]) {
        delete this.selectedKeys[key];
      } else {
        this.selectedKeys[key] = true;
      }
      this.setData({ selectedCount: Object.keys(this.selectedKeys).length });
      this.refreshRecordedItems();
      return;
    }
    recording = this.localState.recordings[key];
    if (recording) {
      sources = [recording];
    } else {
      map = this.pinyinMap;
      if (card.char.length === 1 && card.pinyin) {
        map = {};
        map[card.char] = card.pinyin;
      }
      sources = this.speechData.textToSyllableSources(card.char, map);
    }
    if (!sources.length) {
      this.setData({ notice: '“' + key + '”还没有声音，可以请家人录音' });
      return;
    }
    this.destroyAudioPlayer();
    playerModule = require('../../utils/sequence-audio-player.js');
    this.audioPlayer = playerModule.createSequenceAudioPlayer(function () {
      return wx.createInnerAudioContext();
    });
    this.audioPlayer.play(sources, {
      onPlay: function () { that.setData({ notice: '' }); },
      onError: function () { that.setData({ notice: '声音没有播出来，请再试一次' }); }
    });
  },

  onRemoveSelectedTap: function () {
    var keys = Object.keys(this.selectedKeys || {});
    var that = this;
    if (!keys.length) { return; }
    wx.showModal({
      title: '移出已录？',
      content: '只从这里移出，学习记录和家人录音都会保留。',
      confirmText: '移出',
      success: function (result) {
        if (!result.confirm) { return; }
        var hidden = that.localState.hiddenRecorded;
        keys.forEach(function (key) { hidden[key] = true; });
        if (!that.localStore.save(that.localState).ok) {
          keys.forEach(function (key) { delete hidden[key]; });
          that.setData({ notice: '手机暂时记不住，请再试一次' });
          return;
        }
        that.selectedKeys = {};
        that.setData({ isOrganizing: false, selectedCount: 0, notice: '' });
        that.refreshRecordedItems();
      }
    });
  },

  destroyAudioPlayer: function () {
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    }
  },

  onTodayTap: function () {
    this.goTo('/pages/index/index', '今天页面暂时打不开，请再试一次');
  },

  onReviewTap: function () {
    this.goTo('/pages/review/review', '复习页面暂时打不开，请再试一次');
  },

  onProfileTap: function () {
    this.setData({ notice: '' });
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
    if (this.inputCountdownTimer) {
      clearInterval(this.inputCountdownTimer);
      this.inputCountdownTimer = null;
    }
    if (this.data.showInputCountdown || this.data.inputCountdown) {
      this.setData({ inputCountdown: '', showInputCountdown: false });
    }
  },

  onHide: function () {
    this.destroyAudioPlayer();
    this.clearInputTimer();
  },

  onUnload: function () {
    this.destroyAudioPlayer();
    this.clearInputTimer();
  }
});
