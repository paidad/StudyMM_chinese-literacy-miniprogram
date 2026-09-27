Page({
  data: {
    rawInput: '',
    parsedCards: [],
    hasParsed: false,
    selectedIndex: 0,
    selectedChar: '',
    editPinyin: '',
    editWords: '',
    editSentence: '',
    editTip: '',
    todayItems: [],
    hasTodayItems: false,
    recordingStatus: '先选一个字词，再录音',
    recordButtonText: '开始录音',
    recordButtonStyle: '',
    recordButtonDisabled: true,
    previewButtonText: '试听录音',
    isRecording: false,
    isStarting: false,
    isSaving: false,
    hasRecording: false,
    showSettings: false,
    notice: ''
  },

  onLoad: function () {
    var storageModule = require('../../utils/storage.js');
    var course = require('../../data/course.js');
    var inputParser = require('../../utils/input-parser.js');
    var recordingModule = require('../../utils/recording.js');
    var fullPinyin = require('../../data/pinyin.js');
    var commonWords = require('../../data/words.js');

    this.course = course;
    this.inputParser = inputParser;
    this.recordingModule = recordingModule;
    this.pinyinMap = fullPinyin;
    this.wordIndex = this.buildWordIndex(commonWords);
    this.localStore = storageModule.createStorage({
      get: function (key) { return wx.getStorageSync(key); },
      set: function (key, value) { wx.setStorageSync(key, value); }
    });
    this.localState = this.localStore.load().state;
    this.refreshTodayItems();

    try {
      this.fileSystem = wx.getFileSystemManager();
      this.recorderManager = wx.getRecorderManager();
      this.bindRecorderEvents();
    } catch (error) {
      this.setData({
        recordButtonDisabled: true,
        recordingStatus: '这台手机暂时不能录音'
      });
    }
  },

  onRawInput: function (event) {
    this.rawInputValue = event.detail.value;
    this.setData({ rawInput: this.rawInputValue });
  },

  onParseTouchEnd: function () {
    this.parseTouchAt = Date.now();
    this.runParse();
  },

  onParseTap: function () {
    if (this.parseTouchAt && Date.now() - this.parseTouchAt < 500) {
      return;
    }
    this.runParse();
  },

  runParse: function () {
    var rawInput = typeof this.rawInputValue === 'string' ? this.rawInputValue : this.data.rawInput;
    var keys = this.inputParser.parseInput(rawInput);
    var courseMap = this.course.getCardMap();
    var that = this;

    if (keys.length === 0) {
      this.setData({ notice: '没有找到汉字，请重新输入' });
      return;
    }
    this.editCards = keys.map(function (key) {
      var source = that.localState.chars[key] || courseMap[key];
      if (source) {
        return {
          char: key,
          pinyin: source.pinyin,
          words: source.words.slice(),
          sentence: source.sentence,
          tip: source.tip,
          lesson: source.lesson || 0,
          updatedAt: source.updatedAt || 0
        };
      }
      return {
        char: key,
        pinyin: that.guessPinyin(key, that.pinyinMap),
        words: that.guessWords(key),
        sentence: '',
        tip: '看清字形，慢慢记。',
        lesson: 0,
        updatedAt: 0
      };
    });
    this.setData({
      parsedCards: this.editCards.map(function (item, index) {
        return { id: item.char + index, char: item.char, index: index, state: index === 0 ? 'selected-card' : '' };
      }),
      hasParsed: true,
      selectedIndex: 0,
      notice: '可以逐个检查和修改'
    });
    this.loadEditor(0);
  },

  guessPinyin: function (text, pinyinMap) {
    var parts = [];
    var index;
    for (index = 0; index < text.length; index += 1) {
      parts.push(pinyinMap[text.charAt(index)] || '请填写');
    }
    return parts.join(' ');
  },

  buildWordIndex: function (words) {
    var index = {};
    words.forEach(function (word) {
      var seen = {};
      var charIndex;
      var ch;
      for (charIndex = 0; charIndex < word.length; charIndex += 1) {
        ch = word.charAt(charIndex);
        if (seen[ch]) { continue; }
        seen[ch] = true;
        if (!index[ch]) { index[ch] = []; }
        if (index[ch].length < 3) { index[ch].push(word); }
      }
    });
    return index;
  },

  guessWords: function (text) {
    if (text.length === 1 && this.wordIndex[text] && this.wordIndex[text].length) {
      return this.wordIndex[text].slice();
    }
    return [text];
  },

  onSelectCardTap: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    if (this.data.isRecording || this.data.isSaving || this.data.isStarting) {
      return;
    }
    this.loadEditor(index);
  },

  loadEditor: function (index) {
    var item = this.editCards[index];
    this.destroyAudioPlayer();
    this.setData({
      selectedIndex: index,
      selectedChar: item.char,
      editPinyin: item.pinyin,
      editWords: item.words.join('、'),
      editSentence: item.sentence,
      editTip: item.tip,
      parsedCards: this.editCards.map(function (card, cardIndex) {
        return { id: card.char + cardIndex, char: card.char, index: cardIndex, state: cardIndex === index ? 'selected-card' : '' };
      }),
      hasRecording: false,
      recordButtonDisabled: false,
      recordButtonText: '开始录音',
      previewButtonText: '试听录音',
      recordingStatus: '点一下开始录音，最长录 4 秒'
    });
    this.refreshRecordingState(item.char);
  },

  onPinyinInput: function (event) {
    this.editCards[this.data.selectedIndex].pinyin = event.detail.value;
    this.setData({ editPinyin: event.detail.value });
  },

  onWordsInput: function (event) {
    var value = event.detail.value;
    this.editCards[this.data.selectedIndex].words = value.split(/[\s,，、]+/).filter(function (item) { return !!item; });
    this.setData({ editWords: value });
  },

  onSentenceInput: function (event) {
    this.editCards[this.data.selectedIndex].sentence = event.detail.value;
    this.setData({ editSentence: event.detail.value });
  },

  onTipInput: function (event) {
    this.editCards[this.data.selectedIndex].tip = event.detail.value;
    this.setData({ editTip: event.detail.value });
  },

  onAddTodayTap: function () {
    var appData = require('../../utils/app-data.js');
    var todayText = appData.formatDate(Date.now());
    var todayKeys = this.localState.today.date === todayText ? this.localState.today.chars.slice() : [];
    var seen = {};
    var that = this;

    todayKeys.forEach(function (key) { seen[key] = true; });
    this.editCards.forEach(function (item) {
      var saved = {
        char: item.char,
        pinyin: item.pinyin || '请填写拼音',
        words: item.words.length > 0 ? item.words : [item.char],
        sentence: item.sentence || '请家人补一句常用的话。',
        tip: item.tip || '看清字形，慢慢记。',
        lesson: item.lesson || 0,
        updatedAt: Date.now()
      };
      that.localState.chars[item.char] = saved;
      if (!seen[item.char]) {
        seen[item.char] = true;
        todayKeys.push(item.char);
      }
    });
    this.localState.today = { date: todayText, chars: todayKeys };
    if (this.saveState()) {
      this.setData({ notice: '已经放到今天，顺序也记住了' });
      this.refreshTodayItems();
    }
  },

  refreshTodayItems: function () {
    var appData = require('../../utils/app-data.js');
    var course = this.course;
    var state = this.localState;
    var keys = state.today.date === appData.formatDate(Date.now()) ? state.today.chars : [];
    var items = [];

    keys.forEach(function (key, index) {
      var item = appData.getCard(state, course, key);
      if (item) {
        items.push({ id: key + index, char: key });
      }
    });
    this.setData({ todayItems: items, hasTodayItems: items.length > 0 });
  },

  onRemoveTodayTap: function (event) {
    var key = event.currentTarget.dataset.char;
    this.localState.today.chars = this.localState.today.chars.filter(function (item) {
      return item !== key;
    });
    if (this.saveState()) {
      this.setData({ notice: '已经从今天拿掉，学习记录还保留着' });
      this.refreshTodayItems();
    }
  },

  onClearTodayTap: function () {
    var appData = require('../../utils/app-data.js');
    this.localState.today = { date: appData.formatDate(Date.now()), chars: [] };
    if (this.saveState()) {
      this.setData({ notice: '今天的安排已经清空，学过的数据还在' });
      this.refreshTodayItems();
    }
  },

  saveState: function () {
    var result = this.localStore.save(this.localState);
    if (!result.ok) {
      this.setData({ notice: '手机暂时记不住，请再试一次' });
      return false;
    }
    return true;
  },

  bindRecorderEvents: function () {
    var that = this;
    this.recorderOnStart = function () {
      that.setData({
        isStarting: false,
        isRecording: true,
        recordButtonDisabled: false,
        recordButtonText: '停止录音',
        recordButtonStyle: 'record-button-stop',
        recordingStatus: '录音倒计时：3 秒'
      });
      that.startRecordingCountdown();
    };
    this.recorderOnStop = function (result) { that.handleRecorderStop(result); };
    this.recorderOnError = function () {
      that.clearRecordingCountdown();
      that.setData({
        isStarting: false,
        isRecording: false,
        isSaving: false,
        recordButtonDisabled: false,
        recordButtonText: '重新录音',
        recordButtonStyle: '',
        recordingStatus: '录音没有成功，请再试一次'
      });
    };
    this.recorderManager.onStart(this.recorderOnStart);
    this.recorderManager.onStop(this.recorderOnStop);
    this.recorderManager.onError(this.recorderOnError);
  },

  startRecordingCountdown: function () {
    var that = this;
    var remaining = 3;
    this.clearRecordingCountdown();
    this.setData({ recordingStatus: '录音倒计时：3 秒' });
    this.recordingCountdownTimer = setInterval(function () {
      remaining -= 1;
      if (remaining >= 1) {
        that.setData({ recordingStatus: '录音倒计时：' + remaining + ' 秒' });
      } else {
        that.clearRecordingCountdown();
      }
    }, 1000);
  },

  clearRecordingCountdown: function () {
    if (this.recordingCountdownTimer) {
      clearInterval(this.recordingCountdownTimer);
      this.recordingCountdownTimer = null;
    }
  },

  refreshRecordingState: function (key) {
    var that = this;
    var savedPath = this.localState.recordings[key];
    if (!savedPath || !this.fileSystem) {
      return;
    }
    this.fileSystem.access({
      path: savedPath,
      success: function () {
        if (that.data.selectedChar === key) {
          that.setData({ hasRecording: true, recordingStatus: '手机里已经有录音，可以试听、重录或删除' });
        }
      },
      fail: function () {
        delete that.localState.recordings[key];
        that.saveState();
        if (that.data.selectedChar === key) {
          that.setData({ hasRecording: false, recordingStatus: '以前的录音找不到了，可以重新录' });
        }
      }
    });
  },

  onRecordTap: function () {
    if (!this.data.selectedChar || this.data.isStarting || this.data.isSaving) {
      return;
    }
    if (this.data.isRecording) {
      this.stopRecording();
      return;
    }
    this.requestRecordPermission();
  },

  requestRecordPermission: function () {
    var that = this;
    this.destroyAudioPlayer();
    this.recordingKey = this.data.selectedChar;
    this.recordingPath = wx.env.USER_DATA_PATH + '/' + this.recordingModule.createRecordingFileName(this.recordingKey);
    this.setData({ isStarting: true, recordButtonDisabled: true, recordingStatus: '正在准备麦克风' });
    wx.authorize({
      scope: 'scope.record',
      success: function () { that.startRecording(); },
      fail: function () {
        that.setData({
          isStarting: false,
          recordButtonDisabled: false,
          showSettings: true,
          recordingStatus: '请先允许使用麦克风'
        });
      }
    });
  },

  startRecording: function () {
    try {
      this.recorderManager.start(this.recordingModule.createRecorderOptions());
    } catch (error) {
      this.setData({ isStarting: false, recordButtonDisabled: false, recordingStatus: '录音没有开始，请再试一次' });
    }
  },

  stopRecording: function () {
    try {
      this.clearRecordingCountdown();
      this.setData({ isSaving: true, recordButtonDisabled: true, recordingStatus: '正在保存录音' });
      this.recorderManager.stop();
    } catch (error) {
      this.setData({
        isRecording: false,
        isSaving: false,
        recordButtonDisabled: false,
        recordButtonText: '重新录音',
        recordButtonStyle: '',
        recordingStatus: '录音没有停下来，请再试一次'
      });
    }
  },

  handleRecorderStop: function (result) {
    this.clearRecordingCountdown();
    if (this.isLeaving) {
      return;
    }
    this.setData({
      isStarting: false,
      isRecording: false,
      isSaving: true,
      recordButtonDisabled: true,
      recordButtonText: '正在保存',
      recordButtonStyle: ''
    });
    if (!result || !result.tempFilePath) {
      this.finishSaveFailure();
      return;
    }
    this.replaceRecordingFile(result.tempFilePath);
  },

  replaceRecordingFile: function (tempFilePath) {
    var that = this;
    var key = this.recordingKey;
    var oldPath = this.localState.recordings[key] || this.recordingPath;
    this.fileSystem.unlink({
      filePath: oldPath,
      complete: function () {
        that.fileSystem.saveFile({
          tempFilePath: tempFilePath,
          filePath: that.recordingPath,
          success: function (result) { that.finishSaveSuccess(key, result.savedFilePath || that.recordingPath); },
          fail: function () { that.finishSaveFailure(); }
        });
      }
    });
  },

  finishSaveSuccess: function (key, savedPath) {
    var that = this;
    this.localState.recordings[key] = savedPath;
    if (!this.saveState()) {
      this.fileSystem.unlink({ filePath: savedPath });
      delete this.localState.recordings[key];
      this.finishSaveFailure();
      return;
    }
    this.setData({
      isSaving: false,
      recordButtonDisabled: false,
      recordButtonText: '重新录音',
      hasRecording: true,
      recordingStatus: '录音已保存在这台手机里',
      notice: '可以点试听录音'
    });
  },

  finishSaveFailure: function () {
    this.setData({
      isSaving: false,
      recordButtonDisabled: false,
      recordButtonText: '重新录音',
      hasRecording: false,
      recordingStatus: '声音没有保存好，请再录一次'
    });
  },

  onPreviewTap: function () {
    var that = this;
    var savedPath = this.localState.recordings[this.data.selectedChar];
    var audioPlayerModule;
    if (!savedPath || this.data.isRecording || this.data.isSaving) {
      return;
    }
    this.destroyAudioPlayer();
    audioPlayerModule = require('../../utils/audio-player.js');
    this.audioPlayer = audioPlayerModule.createAudioPlayer(function () { return wx.createInnerAudioContext(); });
    this.audioPlayer.play(savedPath, {
      onPlay: function () { that.setData({ previewButtonText: '正在播放', recordingStatus: '正在播放刚才的录音' }); },
      onEnded: function () { that.setData({ previewButtonText: '再听一遍', recordingStatus: '录音播放完了' }); },
      onError: function () { that.setData({ previewButtonText: '再试一次', recordingStatus: '录音没有播出来，请重新录一遍' }); }
    });
  },

  onDeleteRecordingTap: function () {
    var that = this;
    var key = this.data.selectedChar;
    var savedPath = this.localState.recordings[key];
    if (!savedPath || this.data.isRecording || this.data.isSaving) {
      return;
    }
    this.destroyAudioPlayer();
    this.fileSystem.unlink({
      filePath: savedPath,
      success: function () {
        delete that.localState.recordings[key];
        that.saveState();
        that.setData({
          hasRecording: false,
          recordButtonText: '开始录音',
          previewButtonText: '试听录音',
          recordingStatus: '录音已经删掉了'
        });
      },
      fail: function () { that.setData({ recordingStatus: '录音没有删掉，请再试一次' }); }
    });
  },

  onOpenSettingTap: function () {
    var that = this;
    wx.openSetting({
      success: function (result) {
        if (result.authSetting['scope.record']) {
          that.setData({ showSettings: false, recordingStatus: '麦克风已经打开，可以开始录音' });
        } else {
          that.setData({ recordingStatus: '还没有允许使用麦克风' });
        }
      },
      fail: function () { that.setData({ recordingStatus: '设置没有打开，请再试一次' }); }
    });
  },

  destroyAudioPlayer: function () {
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    }
  },

  onBackTap: function () {
    var that = this;
    this.destroyAudioPlayer();
    wx.navigateBack({
      fail: function () {
        wx.redirectTo({
          url: '/pages/index/index',
          fail: function () { that.setData({ notice: '今天页面暂时打不开，请再试一次' }); }
        });
      }
    });
  },

  onUnload: function () {
    this.isLeaving = true;
    this.clearRecordingCountdown();
    this.destroyAudioPlayer();
    if (this.data.isRecording && this.recorderManager) {
      try { this.recorderManager.stop(); } catch (error) {}
    }
    if (this.recorderManager) {
      if (this.recorderManager.offStart) { this.recorderManager.offStart(this.recorderOnStart); }
      if (this.recorderManager.offStop) { this.recorderManager.offStop(this.recorderOnStop); }
      if (this.recorderManager.offError) { this.recorderManager.offError(this.recorderOnError); }
    }
  }
});
