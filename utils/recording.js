function stableHash(text) {
  var hash = 2166136261;
  var index;

  for (index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16);
}

var recordingSequence = 0;

function createRecordingFileName(word) {
  recordingSequence += 1;
  return 'recording_' + stableHash(word) + '_' + Date.now().toString(36) +
    '_' + recordingSequence.toString(36) +
    '_' + Math.floor(Math.random() * 0x100000000).toString(36) + '.mp3';
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
