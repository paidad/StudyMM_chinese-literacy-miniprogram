Page({
  data: {
    showCard: true,
    showQuiz: false,
    showComplete: false,
    card: { char: '', pinyin: '', words: [], sentence: '', tip: '' },
    wordItems: [],
    progressDots: [],
    roundLabel: '先看一遍',
    audioNotice: '',
    quizOptions: [],
    quizFeedback: '',
    completeTitle: '今天学完了',
    knownCount: 0,
    notice: ''
  },

  onLoad: function (options) {
    var storageModule = require('../../../utils/storage.js');
    var course = require('../../../data/course.js');
    var appData = require('../../../utils/app-data.js');
    var srs = require('../../../utils/srs.js');
    var learningQueue = require('../../../utils/learning-queue.js');
    var speechData = require('../../../utils/speech-data.js');
    var pinyinMap = require('../../../data/pinyin.js');
    var phraseMap = require('../../data/phrase-map.js');
    var loadResult;
    var keys;
    var that = this;

    this.mode = options && options.mode === 'review' ? 'review' : 'today';
    this.course = course;
    this.appData = appData;
    this.srs = srs;
    this.learningQueue = learningQueue;
    this.speechData = speechData;
    this.pinyinMap = pinyinMap;
    this.phraseMap = phraseMap;
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

    if (this.mode === 'review') {
      keys = srs.getDueKeys(this.localState.progress, Date.now());
      this.originalCards = keys.map(function (key) {
        return appData.getCard(that.localState, course, key);
      }).filter(function (item) {
        return !!item;
      });
    } else {
      this.originalCards = appData.getTodayCards(this.localState, course, Date.now());
    }

    if (this.originalCards.length === 0) {
      this.setData({
        showCard: false,
        showQuiz: false,
        showComplete: true,
        completeTitle: this.mode === 'review' ? '现在没有要复习的字' : '今天没有要学的字',
        knownCount: Object.keys(this.localState.progress).length
      });
      return;
    }

    this.sessionCards = this.originalCards.slice();
    this.currentIndex = 0;
    this.round = 1;
    this.unfamiliarKeys = [];
    this.newKeys = {};
    this.showCurrentCard();
  },

  showCurrentCard: function () {
    var card = this.sessionCards[this.currentIndex];
    var existing = this.localState.progress[card.char];
    var now = Date.now();
    var that = this;

    if (!existing) {
      this.newKeys[card.char] = true;
      this.localState.progress[card.char] = this.srs.recordFirstSeen(null, card.char, now);
      this.saveState();
    }

    this.currentCard = card;
    this.setData({
      showCard: true,
      showQuiz: false,
      showComplete: false,
      card: card,
      wordItems: card.words.map(function (word, index) {
        return { id: word + index, text: word, index: index };
      }),
      progressDots: this.sessionCards.map(function (item, index) {
        var state = 'waiting';
        if (index < that.currentIndex) {
          state = 'done';
        } else if (index === that.currentIndex) {
          state = 'current';
        }
        return { id: item.char + index, state: state };
      }),
      roundLabel: this.round === 1 ? '先看一遍' : '再看一次刚才不熟的字',
      audioNotice: '',
      notice: ''
    });

    this.clearAutoAudioTimer();
    this.autoAudioTimer = setTimeout(function () {
      that.playCardAudio('char', 0);
    }, 350);
  },

  onListenTap: function () {
    this.playCardAudio('char', 0);
  },

  onWordTap: function (event) {
    this.playCardAudio('word', Number(event.currentTarget.dataset.index));
  },

  onSentenceTap: function () {
    this.playCardAudio('sentence', 0);
  },

  getAudioSources: function (card, kind, index) {
    var recordingPath = this.localState.recordings[card.char] || '';
    var text = card.char;
    var phraseKey;
    var fallbackMap = this.pinyinMap;

    if (kind === 'char' && recordingPath) {
      return { sources: [recordingPath], type: 'recording' };
    }
    if (kind === 'word') {
      text = card.words[index] || '';
    }
    if (kind === 'sentence') {
      text = card.sentence || '';
    }
    phraseKey = this.phraseMap[text];
    if (typeof phraseKey === 'string') {
      return {
        sources: ['/study/audio/' + phraseKey + '.mp3'],
        fallbackSources: this.speechData.textToSyllableSources(text, fallbackMap),
        type: 'phrase'
      };
    }
    if (kind === 'char' && text.length === 1 && card.pinyin) {
      fallbackMap = {};
      fallbackMap[text] = card.pinyin;
    }
    return {
      sources: this.speechData.textToSyllableSources(text, fallbackMap),
      type: 'syllable'
    };
  },

  playCardAudio: function (kind, index) {
    var audio = this.getAudioSources(this.currentCard, kind, index);

    if (!audio.sources.length) {
      this.destroyAudioPlayer();
      this.setData({ audioNotice: '还没有声音，请家人录一遍' });
      return;
    }
    this.playSources(audio.sources, audio.type, audio.fallbackSources || []);
  },

  playSources: function (sources, sourceType, fallbackSources) {
    var that = this;
    var audioPlayerModule;

    if (!this.audioPlayer) {
      audioPlayerModule = require('../../../utils/sequence-audio-player.js');
      this.audioPlayer = audioPlayerModule.createSequenceAudioPlayer(function () {
        return wx.createInnerAudioContext();
      });
    }
    this.audioPlayer.play(sources, {
      onPlay: function () {
        that.setData({ audioNotice: sourceType === 'recording' ? '正在播放家人录音' : '正在读' });
      },
      onEnded: function () {
        that.setData({ audioNotice: '' });
      },
      onError: function () {
        if (fallbackSources && fallbackSources.length) {
          that.playSources(fallbackSources, 'syllable', []);
        } else {
          that.setData({ audioNotice: '声音没有播出来，请家人录一遍' });
        }
      }
    });
  },

  onWriteTap: function () {
    var that = this;
    this.destroyAudioPlayer();
    wx.navigateTo({
      url: '/stroke/pages/write/write?char=' + encodeURIComponent(this.currentCard.char),
      success: function (result) {
        if (result.eventChannel && result.eventChannel.on) {
          result.eventChannel.on('writeDone', function () {
            that.advanceCard();
          });
        }
      },
      fail: function () {
        that.setData({ notice: '写字页面没有打开，请再试一次' });
      }
    });
  },

  onNotKnownTap: function () {
    if (this.round === 1) {
      this.unfamiliarKeys.push(this.currentCard.char);
    }
    this.advanceCard();
  },

  onKnownTap: function () {
    this.advanceCard();
  },

  advanceCard: function () {
    this.destroyAudioPlayer();
    this.clearAutoAudioTimer();
    this.currentIndex += 1;
    if (this.currentIndex < this.sessionCards.length) {
      this.showCurrentCard();
      return;
    }

    if (this.round === 1) {
      var secondRoundKeys = this.learningQueue.createSecondRound(this.unfamiliarKeys);
      var that = this;
      if (secondRoundKeys.length > 0) {
        this.sessionCards = secondRoundKeys.map(function (key) {
          return that.originalCards.filter(function (item) {
            return item.char === key;
          })[0];
        }).filter(function (item) {
          return !!item;
        });
        this.round = 2;
        this.currentIndex = 0;
        this.showCurrentCard();
        return;
      }
    }
    this.startQuiz();
  },

  startQuiz: function () {
    var taughtCards = this.appData.getTaughtCards(this.localState, this.course, this.originalCards);
    this.quizQuestions = this.learningQueue.createQuizQuestions(this.originalCards, taughtCards);
    this.quizIndex = 0;
    this.showQuizQuestion();
  },

  showQuizQuestion: function () {
    var question = this.quizQuestions[this.quizIndex];
    var that = this;

    this.currentQuestion = question;
    this.quizLocked = false;
    this.currentCard = question.answer;
    this.setData({
      showCard: false,
      showQuiz: true,
      showComplete: false,
      quizOptions: question.options.map(function (item, index) {
        return { id: item.char + index, char: item.char, state: 'quiz-option-normal' };
      }),
      quizFeedback: '',
      audioNotice: '听一听，选出听到的字'
    });
    this.clearAutoAudioTimer();
    this.autoAudioTimer = setTimeout(function () {
      that.playCardAudio('char', 0);
    }, 300);
  },

  onReplayQuestionTap: function () {
    this.playCardAudio('char', 0);
  },

  onQuizChoiceTap: function (event) {
    var selected = event.currentTarget.dataset.char;
    var answer = this.currentQuestion.answer.char;
    var isCorrect;
    var now;
    var existing;
    var that = this;

    if (this.quizLocked) {
      return;
    }
    this.quizLocked = true;
    isCorrect = selected === answer;
    now = Date.now();
    existing = this.localState.progress[answer];
    if (this.newKeys[answer]) {
      this.localState.progress[answer] = this.srs.recordFirstSessionAnswer(existing, isCorrect, now);
    } else {
      this.localState.progress[answer] = this.srs.recordReview(existing, isCorrect, now);
    }
    this.saveState();

    this.setData({
      quizOptions: this.data.quizOptions.map(function (item) {
        var state = item.state;
        if (item.char === answer) {
          state = 'quiz-option-correct';
        } else if (item.char === selected) {
          state = 'quiz-option-wrong';
        }
        return { id: item.id, char: item.char, state: state };
      }),
      quizFeedback: isCorrect ? '对了，是“' + answer + '”' : '没关系，正确的是“' + answer + '”'
    });
    this.playCardAudio('char', 0);
    this.answerTimer = setTimeout(function () {
      that.quizIndex += 1;
      if (that.quizIndex < that.quizQuestions.length) {
        that.showQuizQuestion();
      } else {
        that.finishSession();
      }
    }, isCorrect ? 900 : 1700);
  },

  finishSession: function () {
    this.destroyAudioPlayer();
    this.localState.stats = this.appData.updateStreak(this.localState.stats, Date.now());
    this.saveState();
    this.setData({
      showCard: false,
      showQuiz: false,
      showComplete: true,
      completeTitle: this.mode === 'review' ? '复习完成了' : '今天学完了',
      knownCount: Object.keys(this.localState.progress).length,
      audioNotice: ''
    });
  },

  saveState: function () {
    var result = this.localStore.save(this.localState);
    if (!result.ok) {
      this.setData({ notice: '手机暂时记不住进度，关掉后可能会丢失' });
    }
  },

  onHomeTap: function () {
    this.cleanup();
    wx.redirectTo({ url: '/pages/index/index' });
  },

  onReviewPageTap: function () {
    this.cleanup();
    wx.redirectTo({ url: '/pages/review/review' });
  },

  clearAutoAudioTimer: function () {
    if (this.autoAudioTimer) {
      clearTimeout(this.autoAudioTimer);
      this.autoAudioTimer = null;
    }
  },

  destroyAudioPlayer: function () {
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    }
  },

  cleanup: function () {
    this.clearAutoAudioTimer();
    if (this.answerTimer) {
      clearTimeout(this.answerTimer);
      this.answerTimer = null;
    }
    this.destroyAudioPlayer();
  },

  onUnload: function () {
    this.cleanup();
  }
});
