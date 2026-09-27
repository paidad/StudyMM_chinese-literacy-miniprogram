function createAudioPlayer(createContext) {
  var currentContext = null;

  function destroyContext(context) {
    if (!context) {
      return;
    }
    try {
      context.destroy();
    } catch (error) {}
    if (currentContext === context) {
      currentContext = null;
    }
  }

  function destroy() {
    destroyContext(currentContext);
  }

  function play(source, events) {
    var context;
    var handlers = events || {};

    destroy();
    try {
      context = createContext();
      currentContext = context;
      context.onPlay(function () {
        if (handlers.onPlay) {
          handlers.onPlay();
        }
      });
      context.onEnded(function () {
        destroyContext(context);
        if (handlers.onEnded) {
          handlers.onEnded();
        }
      });
      context.onError(function () {
        destroyContext(context);
        if (handlers.onError) {
          handlers.onError();
        }
      });
      context.src = source;
      context.play();
      return true;
    } catch (error) {
      destroyContext(context);
      if (handlers.onError) {
        handlers.onError();
      }
      return false;
    }
  }

  return {
    play: play,
    destroy: destroy
  };
}

module.exports = {
  createAudioPlayer: createAudioPlayer
};
