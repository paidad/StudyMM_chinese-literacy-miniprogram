Page({
  data: {
    todayItems: [],
    isEmpty: false,
    showLessonControls: true,
    showCustomCourseSwitch: true,
    showDefaultCourseSwitch: false,
    lessonNumber: 1,
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
    if (this.localState.courseMode === 'default') {
      this.planResult = appData.ensureDailyCoursePlan(this.localState, course, Date.now());
      if (this.planResult.changed) {
        this.localStore.save(this.localState);
      }
    }
    this.refreshTodayView('');

    this.setData({
      storageNotice: loadResult.ok ? '' : '手机暂时读不到记录，关掉后可能会丢失',
      notice: this.data.notice
    });
  },

  refreshTodayView: function (notice) {
    var isDefaultCourse = this.localState.courseMode === 'default';
    var cards = this.appData.getTodayCards(this.localState, this.course, Date.now());
    var lessonIndex = this.localState.coursePlan ? this.localState.coursePlan.lessonIndex : 0;

    this.todayCards = cards;
    this.setData({
      todayItems: cards.map(function (item, index) {
        return {
          id: item.char + index,
          index: index,
          char: item.char,
          pinyin: item.pinyin
        };
      }),
      isEmpty: cards.length === 0,
      showLessonControls: isDefaultCourse,
      showCustomCourseSwitch: isDefaultCourse,
      showDefaultCourseSwitch: !isDefaultCourse,
      lessonNumber: lessonIndex + 1,
      notice: notice || ''
    });
  },

  onPreviousLessonTap: function () {
    var index;
    if (!this.data.showLessonControls) { return; }
    index = this.localState.coursePlan.lessonIndex;
    if (index <= 0) {
      this.setData({ notice: '已经是第一课了' });
      return;
    }
    this.appData.setCourseLesson(this.localState, this.course, index - 1, Date.now());
    if (!this.localStore.save(this.localState).ok) {
      this.setData({ notice: '课程暂时切换不了，请再试一次' });
      return;
    }
    this.destroyAudioPlayer();
    this.refreshTodayView('已经切换到上一课');
  },

  onNextLessonTap: function () {
    var index;
    var lastIndex;
    if (!this.data.showLessonControls) { return; }
    index = this.localState.coursePlan.lessonIndex;
    lastIndex = this.course.getLessons().length - 1;
    if (index >= lastIndex) {
      this.setData({ notice: '已经是最后一课了' });
      return;
    }
    this.appData.setCourseLesson(this.localState, this.course, index + 1, Date.now());
    if (!this.localStore.save(this.localState).ok) {
      this.setData({ notice: '课程暂时切换不了，请再试一次' });
      return;
    }
    this.destroyAudioPlayer();
    this.refreshTodayView('已经切换到下一课');
  },

  onDefaultCourseTap: function () {
    this.appData.activateDefaultCourse(this.localState, this.course, Date.now());
    if (!this.localStore.save(this.localState).ok) {
      this.localState.courseMode = 'custom';
      this.setData({ notice: '课程暂时切换不了，请再试一次' });
      return;
    }
    this.destroyAudioPlayer();
    this.refreshTodayView('');
  },

  onCustomCourseTap: function () {
    var customCards = this.appData.getCustomCards(this.localState, this.course);
    if (!customCards.length) {
      this.setData({ notice: '还没有录入课程，请先录入' });
      return;
    }
    this.appData.activateCustomCourse(this.localState, Date.now());
    if (!this.localStore.save(this.localState).ok) {
      this.localState.courseMode = 'default';
      this.setData({ notice: '课程暂时切换不了，请再试一次' });
      return;
    }
    this.destroyAudioPlayer();
    this.refreshTodayView('');
  },

  onWordTap: function (event) {
    var savedPath;
    var sources;
    var card;
    var cardIndex;
    var map;
    var that = this;
    var audioPlayerModule;

    if (!this.todayCards || this.todayCards.length === 0) {
      return;
    }
    cardIndex = Number(event.currentTarget.dataset.index);
    if (!isFinite(cardIndex) || cardIndex < 0 || cardIndex >= this.todayCards.length) {
      return;
    }
    card = this.todayCards[cardIndex];
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
        that.setData({ notice: '正在读“' + card.char + '”' });
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
      this.setData({ notice: '今天还没有学习内容，可以请家人录入' });
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
    this.setData({ notice: '' });
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
