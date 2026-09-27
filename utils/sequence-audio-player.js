function createSequenceAudioPlayer(createContext) {
  var context = null;
  var stopped = false;
  function destroy() {
    stopped = true;
    if (context) {
      try { context.stop(); } catch (error) {}
      try { context.destroy(); } catch (error2) {}
      context = null;
    }
  }
  function play(sources, handlers) {
    var index = 0;
    var options = handlers || {};
    destroy();
    stopped = false;
    context = createContext();
    function next() {
      if (stopped) { return; }
      if (index >= sources.length) {
        if (options.onEnded) { options.onEnded(); }
        return;
      }
      context.src = sources[index];
      index += 1;
      context.play();
    }
    context.onEnded(next);
    context.onError(function () {
      if (options.onError) { options.onError(); }
    });
    if (options.onPlay) { options.onPlay(); }
    next();
  }
  return { play: play, destroy: destroy };
}

module.exports = { createSequenceAudioPlayer: createSequenceAudioPlayer };
