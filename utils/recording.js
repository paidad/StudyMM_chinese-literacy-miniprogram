function stableHash(text) {
  var hash = 2166136261;
  var index;

  for (index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16);
}

function createRecordingFileName(word) {
  return 'recording_' + stableHash(word) + '.mp3';
}

function createRecorderOptions() {
  return {
    duration: 4000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
    format: 'mp3'
  };
}

module.exports = {
  createRecordingFileName: createRecordingFileName,
  createRecorderOptions: createRecorderOptions
};
