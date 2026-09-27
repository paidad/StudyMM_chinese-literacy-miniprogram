function hasText(value) {
  return typeof value === 'string' && value.length > 0;
}

function selectPronunciation(options) {
  var syllablePaths = options.syllablePaths || [];

  if (hasText(options.recordingPath)) {
    return {
      type: 'recording',
      sources: [options.recordingPath]
    };
  }

  if (hasText(options.builtinPath)) {
    return {
      type: 'builtin',
      sources: [options.builtinPath]
    };
  }

  if (syllablePaths.length > 0) {
    return {
      type: 'syllables',
      sources: syllablePaths.slice()
    };
  }

  return {
    type: 'missing',
    sources: [],
    message: '还没有声音，请家人录一遍'
  };
}

module.exports = {
  selectPronunciation: selectPronunciation
};
