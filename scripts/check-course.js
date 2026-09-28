// scripts/check-course.js —— 课程数据自检
//
// 用法：  node scripts/check-course.js
//
// 为什么需要这个脚本：
//   data/builtin-course-data.js 的注释里提到 tools/gen_audio.py、tools/check_lessons.py、
//   tools/gen_pinyin.js、tools/gen_words.py、tools/gen_phrase.py 会做校验，
//   但 **tools/ 目录并没有跟到这个仓库里**。也就是说改完课程后没有任何东西替你兜底，
//   这个脚本把「改完校验一遍」这一步补回来。
//
// 检查分三级：
//   致命  会让小程序白屏或崩溃，必须改
//   警告  功能降级（没声音 / 没笔顺 / 看不到），但还能跑
//   提示  影响教学质量，不影响运行
//
// 本脚本不在小程序包里（project.config.json 的 packOptions.ignore 已排除 scripts/）。

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');

var builtin = require(path.join(ROOT, 'data', 'builtin-course-data.js'));
var pinyinMap = require(path.join(ROOT, 'data', 'pinyin.js'));
var strokes = require(path.join(ROOT, 'stroke', 'data', 'strokes.js'));
var speechData = require(path.join(ROOT, 'utils', 'speech-data.js'));

var CHARS = builtin.CHARS;
var LESSONS = builtin.LESSONS;

var fatal = [];
var warn = [];
var hint = [];
var used = {};

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function syllableOf(pinyin) {
  return speechData.syllableKey(pinyin || '');
}

function audioExists(pinyin) {
  var key = syllableOf(pinyin);
  return key ? fs.existsSync(path.join(ROOT, 'audio-py', key + '.mp3')) : false;
}

// ---- 1. LESSONS 引用的字必须在 CHARS 里 ----
// 这是最危险的一条：course.js 里是 builtin.CHARS[key] 直接取属性、紧接着读 source.pinyin，
// 没有做空值判断。写错一个字就是 TypeError，整个课程构建挂掉，首页白屏。
LESSONS.forEach(function (lesson, index) {
  var name = lesson.name || ('第 ' + (index + 1) + ' 课');

  if (!Array.isArray(lesson.chars) || lesson.chars.length === 0) {
    fatal.push('「' + name + '」没有任何字');
    return;
  }

  lesson.chars.forEach(function (key) {
    if (!has(CHARS, key)) {
      fatal.push('「' + name + '」引用了 CHARS 里不存在的字「' + key
        + '」—— course.js 会读 source.pinyin 抛 TypeError，首页白屏');
      return;
    }
    if (used[key]) {
      warn.push('「' + key + '」被多课引用（第 ' + used[key] + ' 课 和 第 ' + (index + 1)
        + ' 课），只有第一次会生效');
    } else {
      used[key] = index + 1;
    }
  });
});

// ---- 2. CHARS 字段完整性 ----
Object.keys(CHARS).forEach(function (key) {
  var card = CHARS[key] || {};

  if (!card.pinyin) {
    fatal.push('「' + key + '」缺 pinyin');
  }
  if (!card.sentence) {
    fatal.push('「' + key + '」缺 sentence');
  }
  if (!card.tip) {
    fatal.push('「' + key + '」缺 tip');
  }
  if (!Array.isArray(card.words) || card.words.length === 0) {
    fatal.push('「' + key + '」的 words 缺失或为空');
  }
});

// ---- 3. 资源覆盖：拼音表 / 音节音频 / 笔顺数据 ----
Object.keys(CHARS).forEach(function (key) {
  var card = CHARS[key] || {};
  var pinyin = card.pinyin || '';

  if (!has(pinyinMap, key)) {
    warn.push('「' + key + '」不在 data/pinyin.js 里 —— 录入页不会自动填拼音，'
      + '音节音频兜底也会失效');
  } else if (pinyinMap[key] !== pinyin) {
    warn.push('「' + key + '」拼音不一致：课程里是 ' + pinyin
      + '，pinyin.js 里是 ' + pinyinMap[key]);
  }

  if (!audioExists(pinyin)) {
    warn.push('「' + key + '」缺音节音频 ' + (syllableOf(pinyin) || '(拼音无法解析)')
      + '.mp3 —— 家人没录音时会提示「请家人录一遍」');
  }

  if (!strokes[key] || strokes[key].length === 0) {
    warn.push('「' + key + '」不在 stroke/data/strokes.js 里 —— '
      + '「看怎么写」会显示「这个字还没有笔顺动画」');
  }
});

// ---- 4. 教学质量（builtin-course-data.js 文件头注释里定的规矩）----
Object.keys(CHARS).forEach(function (key) {
  var card = CHARS[key] || {};
  var sentence = card.sentence || '';
  var tip = card.tip || '';

  if (sentence && sentence.indexOf(key) < 0) {
    hint.push('「' + key + '」例句不含本字：「' + sentence + '」');
  }
  if (sentence.length > 14) {
    hint.push('「' + key + '」例句超过 14 字（' + sentence.length + ' 字）');
  }
  if (tip.length > 20) {
    hint.push('「' + key + '」tip 超过 20 字（' + tip.length + ' 字）');
  }
  (card.words || []).forEach(function (word) {
    if (word.indexOf(key) < 0) {
      hint.push('「' + key + '」组词「' + word + '」不含本字');
    }
  });
});

// ---- 5. 有没有写了却用不到的字 ----
Object.keys(CHARS).forEach(function (key) {
  if (!used[key]) {
    warn.push('「' + key + '」在 CHARS 里，但没有任何课程引用它 —— 学习者永远看不到');
  }
});

// ---- 输出 ----
function dump(title, list) {
  if (list.length === 0) {
    return;
  }
  console.log(title + '（' + list.length + ' 条）');
  list.forEach(function (item) {
    console.log('  · ' + item);
  });
  console.log('');
}

console.log('');
console.log('课程数据自检');
console.log('  课程数 ' + LESSONS.length + '   字数 ' + Object.keys(CHARS).length);
console.log('');

dump('致命 —— 会让小程序白屏或崩溃', fatal);
dump('警告 —— 功能降级，但还能跑', warn);
dump('提示 —— 影响教学质量', hint);

if (fatal.length === 0 && warn.length === 0 && hint.length === 0) {
  console.log('全部通过，没有发现问题。');
  console.log('');
}

console.log('注意：tests/course.test.js 里写死了课程数和字数，');
console.log('      改了课程结构就要同步改那里，或直接跑全部测试。');
console.log('');

process.exit(fatal.length > 0 ? 1 : 0);
