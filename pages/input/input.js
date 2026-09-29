Page({
  data: {
    rawInput: '',
    todayItems: [],
    todayCount: 0,
    hasTodayItems: false,
    selectedChar: '',
    recordingStatus: '',
    recordButtonText: '录音',
    recordButtonDisabled: false,
    isRecording: false,
    isStarting: false,
    isSaving: false,
    hasRecording: false,
    showSettings: false,
    showSupplement: false,
    supplementChar: '',
    editWords: '',
    editSentence: '',
    editTip: '',
    notice: ''
  },

  onLoad: function () {
    var storageModule = require('../../utils/storage.js');
    var commonWords = require('../../data/words.js');

    this.course = require('../../data/course.js');
    this.appData = require('../../utils/app-data.js');
    this.inputParser = require('../../utils/input-parser.js');
    this.recordingModule = require('../../utils/recording.js');
    this.pinyinMap = require('../../data/pinyin.js');
    this.speechData = require('../../utils/speech-data.js');
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
      this.setData({ notice: '这台手机暂时不能录音' });
    }
  },

  onRawInput: function (event) {
    this.rawInputValue = event.detail.value;
    this.setData({ rawInput: this.rawInputValue });
  },

  onAddLearningTouchEnd: function () {
    this.addTouchAt = Date.now();
    this.addInputToToday();
  },

  onAddLearningTap: function () {
    if (this.addTouchAt && Date.now() - this.addTouchAt < 500) {
      return;
    }
    this.addInputToToday();
  },

  onParseTouchEnd: function () {
    this.onAddLearningTouchEnd();
  },

  onParseTap: function () {
    this.onAddLearningTap();
  },

  addInputToToday: function () {
    var rawInput = typeof this.rawInputValue === 'string' ? this.rawInputValue : this.data.rawInput;
    var keys = this.inputParser.parseInput(rawInput);
    var courseMap = this.course.getCardMap();
    var todayText = this.appData.formatDate(Date.now());
    var todayKeys = this.localState.today.chars.slice();
    var seen = {};
    var addedCount = 0;
    var that = this;

    if (keys.length === 0) {
      this.setData({ notice: '没有找到汉字，请重新输入' });
      return;
    }

    todayKeys.forEach(function (key) { seen[key] = true; });
    keys.forEach(function (key) {
      var source = that.localState.chars[key] || courseMap[key];
      var card = source ? {
        char: key,
        pinyin: source.pinyin,
        words: source.words.slice(),
        sentence: source.sentence || '',
        tip: source.tip || '',
        lesson: source.lesson || 0,
        updatedAt: source.updatedAt || 0,
        hasSupplement: source.hasSupplement === true
      } : {
        char: key,
        pinyin: that.guessPinyin(key, that.pinyinMap),
        words: that.guessWords(key),
        sentence: '',
        tip: '',
        lesson: 0,
        updatedAt: 0,
        hasSupplement: false
      };

      card.updatedAt = Date.now();
      that.localState.chars[key] = card;
      if (!seen[key]) {
        seen[key] = true;
        todayKeys.push(key);
        addedCount += 1;
      }
    });

    this.localState.today = { date: todayText, chars: todayKeys };
    this.appData.activateCustomCourse(this.localState, Date.now());
    if (this.saveState()) {
      this.rawInputValue = '';
      this.setData({
        rawInput: '',
        selectedChar: keys[0],
        notice: addedCount > 0 ? '已加入 ' + addedCount + ' 个字词' : '这些字词已经在今天的任务里'
      });
      this.refreshTodayItems();
    }
  },

  guessPinyin: function (text, pinyinMap) {
    var parts = [];
    var index;
    for (index = 0; index < text.length; index += 1) {
      parts.push(pinyinMap[text.charAt(index)] || '请补充拼音');
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

  refreshTodayItems: function () {
    var cards = this.appData.getCustomCards(this.localState, this.course);
    var recordings = this.localState.recordings;
    var activeKey = this.recordingKey;
    var isBusy = this.data.isRecording || this.data.isStarting || this.data.isSaving;

    this.todayCards = cards;
    this.setData({
      todayItems: cards.map(function (item, index) {
        var isActive = isBusy && item.char === activeKey;
        var hasRecording = !!recordings[item.char];
        return {
          id: item.char + index,
          char: item.char,
          pinyin: item.pinyin,
          recordLabel: isActive ? '录制中' : (hasRecording ? '✓ 已录' : '录音'),
          recordState: isActive ? 'recording-button' : (hasRecording ? 'recorded-button' : ''),
          supplementLabel: item.hasSupplement ? '✓ 已补充' : '补充',
          supplementState: item.hasSupplement ? 'supplemented-button' : ''
        };
      }),
      todayCount: cards.length,
      hasTodayItems: cards.length > 0
    });
  },

  updateRecordingRow: function (label, state) {
    var key = this.recordingKey;
    this.setData({
      todayItems: this.data.todayItems.map(function (item) {
        if (item.char !== key) { return item; }
        return {
          id: item.id,
          char: item.char,
          pinyin: item.pinyin,
          recordLabel: label,
          recordState: state || 'recording-button',
          supplementLabel: item.supplementLabel,
          supplementState: item.supplementState
        };
      })
    });
  },

  onTodayWordTap: function (event) {
    var key = event.currentTarget.dataset.char;
    var card = this.appData.getCard(this.localState, this.course, key);
    var savedPath;
    var sources;
    var map;
    var that = this;
    var audioPlayerModule;

    if (!card || this.data.isRecording || this.data.isSaving || this.data.isStarting) {
      return;
    }
    savedPath = this.localState.recordings[key];
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
      this.setData({ notice: '“' + key + '”还没有声音，可以给它录音' });
      return;
    }

    this.destroyAudioPlayer();
    audioPlayerModule = require('../../utils/sequence-audio-player.js');
    this.audioPlayer = audioPlayerModule.createSequenceAudioPlayer(function () {
      return wx.createInnerAudioContext();
    });
    this.audioPlayer.play(sources, {
      onPlay: function () { that.setData({ notice: savedPath ? '正在播放家人录音' : '正在读“' + key + '”' }); },
      onEnded: function () { that.setData({ notice: '' }); },
      onError: function () { that.setData({ notice: '声音没有播出来，请再试一次' }); }
    });
  },

  onSupplementTap: function (event) {
    var key = event.currentTarget.dataset.char;
    var card = this.appData.getCard(this.localState, this.course, key);
    if (!card || this.data.isRecording || this.data.isSaving || this.data.isStarting) {
      return;
    }
    this.destroyAudioPlayer();
    this.setData({
      showSupplement: true,
      supplementChar: key,
      editWords: (card.words || []).join('、'),
      editSentence: card.sentence || '',
      editTip: card.tip || '',
      notice: ''
    });
  },

  onWordsInput: function (event) {
    this.setData({ editWords: event.detail.value });
  },

  onSentenceInput: function (event) {
    this.setData({ editSentence: event.detail.value });
  },

  onTipInput: function (event) {
    this.setData({ editTip: event.detail.value });
  },

  onCancelSupplement: function () {
    this.setData({ showSupplement: false, supplementChar: '' });
  },

  onSaveSupplement: function () {
    var key = this.data.supplementChar;
    var source = this.appData.getCard(this.localState, this.course, key);
    var words;
    if (!source) { return; }
    words = this.data.editWords.split(/[\s,，、]+/).filter(function (item) { return !!item; });
    this.localState.chars[key] = {
      char: key,
      pinyin: source.pinyin,
      words: words.length ? words : [key],
      sentence: this.data.editSentence,
      tip: this.data.editTip,
      lesson: source.lesson || 0,
      updatedAt: Date.now(),
      hasSupplement: true
    };
    if (this.saveState()) {
      this.setData({ showSupplement: false, supplementChar: '', notice: '“' + key + '”的补充信息已保存' });
      this.refreshTodayItems();
    }
  },

  stopTouchMove: function () {},

  onRemoveTodayTap: function (event) {
    var key = event.currentTarget.dataset.char;
    var todayText = this.appData.formatDate(Date.now());
    var currentKeys = this.localState.today.chars.slice();
    this.localState.today = {
      date: todayText,
      chars: currentKeys.filter(function (item) { return item !== key; })
    };
    if (this.saveState()) {
      this.setData({ notice: '已经拿掉“' + key + '”，录音和补充信息仍然保留' });
      this.refreshTodayItems();
    }
  },

  onClearTodayTap: function () {
    var that = this;
    this.confirmAction('清空今天的学习任务？', '录音和补充信息会保留。', '清空', function () {
      that.localState.today = { date: that.appData.formatDate(Date.now()), chars: [] };
      if (that.saveState()) {
        that.setData({ notice: '今天的学习任务已经清空' });
        that.refreshTodayItems();
      }
    });
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
        recordingStatus: '录音倒计时：3 秒',
        notice: '请读出“' + that.recordingKey + '”'
      });
      that.updateRecordingRow('3', 'recording-button');
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
        recordButtonText: '录音',
        recordingStatus: '录音没有成功，请再试一次',
        notice: '录音没有成功，请再试一次'
      });
      that.refreshTodayItems();
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
        if (that.updateRecordingRow) { that.updateRecordingRow(String(remaining), 'recording-button'); }
      } else {
        that.clearRecordingCountdown();
        if (that.updateRecordingRow) { that.updateRecordingRow('录制中', 'recording-button'); }
      }
    }, 1000);
  },

  clearRecordingCountdown: function () {
    if (this.recordingCountdownTimer) {
      clearInterval(this.recordingCountdownTimer);
      this.recordingCountdownTimer = null;
    }
  },

  onRecordRowTap: function (event) {
    var key = event.currentTarget.dataset.char;
    var that = this;
    if (this.data.isStarting || this.data.isSaving) { return; }
    if (this.data.isRecording) {
      if (this.recordingKey === key) { this.stopRecording(); }
      return;
    }
    if (this.localState.recordings[key]) {
      this.confirmAction('删除“' + key + '”的录音？', '删除后可以重新录制。', '删除', function () {
        that.deleteRecordingForKey(key);
      });
      return;
    }
    this.setData({ selectedChar: key, hasRecording: false });
    this.requestRecordPermission(key);
  },

  onRecordTap: function () {
    if (!this.data.selectedChar || this.data.isStarting || this.data.isSaving) { return; }
    if (this.data.isRecording) {
      this.stopRecording();
      return;
    }
    this.requestRecordPermission(this.data.selectedChar);
  },

  requestRecordPermission: function (key) {
    var that = this;
    if (!this.recorderManager || !this.fileSystem) {
      this.setData({ notice: '这台手机暂时不能录音' });
      return;
    }
    this.destroyAudioPlayer();
    this.recordingKey = key;
    this.recordingPath = wx.env.USER_DATA_PATH + '/' + this.recordingModule.createRecordingFileName(key);
    this.setData({ isStarting: true, recordButtonDisabled: true, recordingStatus: '正在准备麦克风', notice: '正在准备麦克风' });
    this.updateRecordingRow('准备中', 'recording-button');
    wx.authorize({
      scope: 'scope.record',
      success: function () { that.startRecording(); },
      fail: function () {
        that.setData({
          isStarting: false,
          recordButtonDisabled: false,
          showSettings: true,
          recordingStatus: '请先允许使用麦克风',
          notice: '请先允许使用麦克风'
        });
        that.refreshTodayItems();
      }
    });
  },

  startRecording: function () {
    try {
      this.recorderManager.start(this.recordingModule.createRecorderOptions());
    } catch (error) {
      this.setData({ isStarting: false, recordButtonDisabled: false, notice: '录音没有开始，请再试一次' });
      this.refreshTodayItems();
    }
  },

  stopRecording: function () {
    try {
      this.clearRecordingCountdown();
      this.setData({ isSaving: true, recordButtonDisabled: true, recordingStatus: '正在保存录音', notice: '正在保存录音' });
      this.updateRecordingRow('保存中', 'recording-button');
      this.recorderManager.stop();
    } catch (error) {
      this.setData({ isRecording: false, isSaving: false, recordButtonDisabled: false, notice: '录音没有停下来，请再试一次' });
      this.refreshTodayItems();
    }
  },

  handleRecorderStop: function (result) {
    this.clearRecordingCountdown();
    if (this.isLeaving) { return; }
    this.setData({
      isStarting: false,
      isRecording: false,
      isSaving: true,
      recordButtonDisabled: true,
      recordButtonText: '正在保存'
    });
    this.updateRecordingRow('保存中', 'recording-button');
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
      recordButtonText: '录音',
      hasRecording: true,
      recordingStatus: '录音已保存在这台手机里',
      notice: '“' + key + '”已经录好了'
    });
    this.refreshTodayItems();
  },

  finishSaveFailure: function () {
    this.setData({
      isSaving: false,
      recordButtonDisabled: false,
      recordButtonText: '录音',
      hasRecording: false,
      recordingStatus: '声音没有保存好，请再录一次',
      notice: '声音没有保存好，请再录一次'
    });
    this.refreshTodayItems();
  },

  onDeleteRecordingTap: function () {
    this.deleteRecordingForKey(this.data.selectedChar);
  },

  deleteRecordingForKey: function (key) {
    var that = this;
    var savedPath = this.localState.recordings[key];
    if (!savedPath || this.data.isRecording || this.data.isSaving || !this.fileSystem) { return; }
    this.destroyAudioPlayer();
    this.fileSystem.unlink({
      filePath: savedPath,
      success: function () {
        delete that.localState.recordings[key];
        that.saveState();
        that.setData({ hasRecording: false, recordingStatus: '录音已经删掉了', notice: '“' + key + '”的录音已经删除' });
        that.refreshTodayItems();
      },
      fail: function () { that.setData({ notice: '录音没有删掉，请再试一次' }); }
    });
  },

  onOpenSettingTap: function () {
    var that = this;
    wx.openSetting({
      success: function (result) {
        if (result.authSetting['scope.record']) {
          that.setData({ showSettings: false, notice: '麦克风已经打开，可以开始录音' });
        } else {
          that.setData({ notice: '还没有允许使用麦克风' });
        }
      },
      fail: function () { that.setData({ notice: '设置没有打开，请再试一次' }); }
    });
  },

  confirmAction: function (title, content, confirmText, onConfirm) {
    if (!wx.showModal) {
      onConfirm();
      return;
    }
    wx.showModal({
      title: title,
      content: content,
      confirmText: confirmText,
      confirmColor: '#A63E0C',
      success: function (result) {
        if (result.confirm) { onConfirm(); }
      }
    });
  },

  onTodayTap: function () {
    this.goTo('/pages/index/index', '今天页面暂时打不开，请再试一次');
  },

  onReviewTap: function () {
    this.goTo('/pages/review/review', '复习页面暂时打不开，请再试一次');
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

  destroyAudioPlayer: function () {
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    }
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
