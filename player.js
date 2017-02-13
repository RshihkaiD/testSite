'use strict';

var sampleplayer = sampleplayer || {};


sampleplayer.CastPlayer = function(element) {
  this.debug_ = sampleplayer.DISABLE_DEBUG_;
  if (this.debug_) {
    cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
    cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
  }
  this.element_ = element;
  this.type_;

  this.setType_(sampleplayer.Type.UNKNOWN, false);
  this.state_;
  this.lastStateTransitionTime_ = 0;

  this.setState_(sampleplayer.State.LAUNCHING, false);
  this.burnInPreventionIntervalId_;
  this.idleTimerId_;
  this.seekingTimerId_;

  
  this.setStateDelayTimerId_;

  
  this.currentApplicationState_;

  this.progressBarInnerElement_ = this.getElementByClass_(
      '.controls-progress-inner');

  this.progressBarThumbElement_ = this.getElementByClass_(
      '.controls-progress-thumb');

  this.curTimeElement_ = this.getElementByClass_('.controls-cur-time');

  this.totalTimeElement_ = this.getElementByClass_('.controls-total-time');

  this.previewModeTimerElement_ = this.getElementByClass_('.preview-mode-timer-countdown');

  
  this.bufferingHandler_ = this.onBuffering_.bind(this);

  
  this.player_ = null;

  
  this.preloadPlayer_ = null;

  
  this.textTrackType_ = null;

  
  this.playerAutoPlay_ = false;

  
  this.displayPreviewMode_ = false;

  
  this.deferredPlayCallbackId_ = null;

  
  this.playerReady_ = false;


  this.metadataLoaded_ = false;

  
  this.mediaElement_ = 
      (this.element_.querySelector('video'));
  this.mediaElement_.addEventListener('error', this.onError_.bind(this), false);
  this.mediaElement_.addEventListener('playing', this.onPlaying_.bind(this),
      false);
  this.mediaElement_.addEventListener('pause', this.onPause_.bind(this), false);
  this.mediaElement_.addEventListener('ended', this.onEnded_.bind(this), false);
  this.mediaElement_.addEventListener('abort', this.onAbort_.bind(this), false);
  this.mediaElement_.addEventListener('timeupdate', this.onProgress_.bind(this),
      false);
  this.mediaElement_.addEventListener('seeking', this.onSeekStart_.bind(this),
      false);
  this.mediaElement_.addEventListener('seeked', this.onSeekEnd_.bind(this),
      false);


  this.receiverManager_ = cast.receiver.CastReceiverManager.getInstance();
  this.receiverManager_.onReady = this.onReady_.bind(this);
  this.receiverManager_.onSenderDisconnected =
      this.onSenderDisconnected_.bind(this);
  this.receiverManager_.onVisibilityChanged =
      this.onVisibilityChanged_.bind(this);
  this.receiverManager_.setApplicationState(
      sampleplayer.getApplicationState_());


  
  this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);

  
  this.onLoadOrig_ =
      this.mediaManager_.onLoad.bind(this.mediaManager_);
  this.mediaManager_.onLoad = this.onLoad_.bind(this);

  
  this.onEditTracksInfoOrig_ =
      this.mediaManager_.onEditTracksInfo.bind(this.mediaManager_);
  this.mediaManager_.onEditTracksInfo = this.onEditTracksInfo_.bind(this);

  
  this.onMetadataLoadedOrig_ =
      this.mediaManager_.onMetadataLoaded.bind(this.mediaManager_);
  this.mediaManager_.onMetadataLoaded = this.onMetadataLoaded_.bind(this);

  
  this.onStopOrig_ =
      this.mediaManager_.onStop.bind(this.mediaManager_);
  this.mediaManager_.onStop = this.onStop_.bind(this);

  
  this.onLoadMetadataErrorOrig_ =
      this.mediaManager_.onLoadMetadataError.bind(this.mediaManager_);
  this.mediaManager_.onLoadMetadataError = this.onLoadMetadataError_.bind(this);

  this.onErrorOrig_ =
      this.mediaManager_.onError.bind(this.mediaManager_);
  this.mediaManager_.onError = this.onError_.bind(this);

  this.mediaManager_.customizedStatusCallback =
      this.customizedStatusCallback_.bind(this);

  this.mediaManager_.onPreload = this.onPreload_.bind(this);
  this.mediaManager_.onCancelPreload = this.onCancelPreload_.bind(this);
};


sampleplayer.IDLE_TIMEOUT = {
  LAUNCHING: 1000 * 60 * 5, // 5 minutes
  LOADING: 1000 * 60 * 5,  // 5 minutes
  PAUSED: 1000 * 60 * 20,  // 20 minutes
  DONE: 1000 * 60 * 5,     // 5 minutes
  IDLE: 1000 * 60 * 5      // 5 minutes
};


sampleplayer.Type = {
  AUDIO: 'audio',
  VIDEO: 'video',
  UNKNOWN: 'unknown'
};


sampleplayer.TextTrackType = {
  SIDE_LOADED_TTML: 'ttml',
  SIDE_LOADED_VTT: 'vtt',
  SIDE_LOADED_UNSUPPORTED: 'unsupported',
  EMBEDDED: 'embedded'
};


sampleplayer.CaptionsMimeType = {
  TTML: 'application/ttml+xml',
  VTT: 'text/vtt'
};


sampleplayer.TrackType = {
  AUDIO: 'audio',
  VIDEO: 'video',
  TEXT: 'text'
};


sampleplayer.State = {
  LAUNCHING: 'launching',
  LOADING: 'loading',
  BUFFERING: 'buffering',
  PLAYING: 'playing',
  PAUSED: 'paused',
  DONE: 'done',
  IDLE: 'idle'
};

sampleplayer.BURN_IN_TIMEOUT = 30 * 1000;

sampleplayer.MEDIA_INFO_DURATION_ = 3 * 1000;


sampleplayer.TRANSITION_DURATION_ = 1.5;

sampleplayer.ENABLE_DEBUG_ = true;

sampleplayer.DISABLE_DEBUG_ = false;


sampleplayer.CastPlayer.prototype.getElementByClass_ = function(className) {
  var element = this.element_.querySelector(className);
  if (element) {
    return element;
  } else {
    throw Error('Cannot find element with class: ' + className);
  }
};


sampleplayer.CastPlayer.prototype.getMediaElement = function() {
  return this.mediaElement_;
};


sampleplayer.CastPlayer.prototype.getMediaManager = function() {
  return this.mediaManager_;
};


sampleplayer.CastPlayer.prototype.getPlayer = function() {
  return this.player_;
};

sampleplayer.CastPlayer.prototype.start = function() {
  this.receiverManager_.start();
};

sampleplayer.CastPlayer.prototype.preload = function(mediaInformation) {
  this.log_('preload');
  // For video formats that cannot be preloaded (mp4...), display preview UI.
  if (sampleplayer.canDisplayPreview_(mediaInformation || {})) {
    this.showPreviewMode_(mediaInformation);
    return true;
  }
  if (!sampleplayer.supportsPreload_(mediaInformation || {})) {
    this.log_('preload: no supportsPreload_');
    return false;
  }
  if (this.preloadPlayer_) {
    this.preloadPlayer_.unload();
    this.preloadPlayer_ = null;
  }
  // Only videos are supported for now
  var couldPreload = this.preloadVideo_(mediaInformation);
  if (couldPreload) {
    this.showPreviewMode_(mediaInformation);
  }
  this.log_('preload: couldPreload=' + couldPreload);
  return couldPreload;
};

sampleplayer.CastPlayer.prototype.showPreviewModeMetadata = function(show) {
  this.element_.setAttribute('preview-mode', show.toString());
};

sampleplayer.CastPlayer.prototype.showPreviewMode_ = function(mediaInformation) {
  this.displayPreviewMode_ = true;
  this.loadPreviewModeMetadata_(mediaInformation);
  this.showPreviewModeMetadata(true);
};



sampleplayer.CastPlayer.prototype.hidePreviewMode_ = function() {
  this.showPreviewModeMetadata(false);
  this.displayPreviewMode_ = false;
};


sampleplayer.CastPlayer.prototype.preloadVideo_ = function(mediaInformation) {
  this.log_('preloadVideo_');
  var self = this;
  var url = mediaInformation.contentId;
  var protocolFunc = sampleplayer.getProtocolFunction_(mediaInformation);
  if (!protocolFunc) {
    this.log_('No protocol found for preload');
    return false;
  }
  var host = new cast.player.api.Host({
    'url': url,
    'mediaElement': self.mediaElement_
  });
  host.onError = function() {
    self.preloadPlayer_.unload();
    self.preloadPlayer_ = null;
    self.showPreviewModeMetadata(false);
    self.displayPreviewMode_ = false;
    self.log_('Error during preload');
  };
  self.preloadPlayer_ = new cast.player.api.Player(host);
  self.preloadPlayer_.preload(protocolFunc(host));
  return true;
};

sampleplayer.CastPlayer.prototype.load = function(info) {
  this.log_('onLoad_');
  clearTimeout(this.idleTimerId_);
  var self = this;
  var media = info.message.media || {};
  var contentType = media.contentType;
  var playerType = sampleplayer.getType_(media);
  var isLiveStream = media.streamType === cast.receiver.media.StreamType.LIVE;
  if (!media.contentId) {
    this.log_('Load failed: no content');
    self.onLoadMetadataError_(info);
  } else if (playerType === sampleplayer.Type.UNKNOWN) {
    this.log_('Load failed: unknown content type: ' + contentType);
    self.onLoadMetadataError_(info);
  } else {
    this.log_('Loading: ' + playerType);
    self.resetMediaElement_();
    self.setType_(playerType, isLiveStream);
    var preloaded = false;
    switch (playerType) {
      case sampleplayer.Type.AUDIO:
        self.loadAudio_(info);
        break;
      case sampleplayer.Type.VIDEO:
        preloaded = self.loadVideo_(info);
        break;
    }
    self.playerReady_ = false;
    self.metadataLoaded_ = false;
    self.loadMetadata_(media);
    self.showPreviewModeMetadata(false);
    self.displayPreviewMode_ = false;
    sampleplayer.preload_(media, function() {
      self.log_('preloaded=' + preloaded);
      if (preloaded) {
        // Data is ready to play so transiton directly to playing.
        self.setState_(sampleplayer.State.PLAYING, false);
        self.playerReady_ = true;
        self.maybeSendLoadCompleted_(info);
        // Don't display metadata again, since autoplay already did that.
        self.deferPlay_(0);
        self.playerAutoPlay_ = false;
      } else {
        sampleplayer.transition_(self.element_, sampleplayer.TRANSITION_DURATION_, function() {
          self.setState_(sampleplayer.State.LOADING, false);
          // Only send load completed after we reach this point so the media
          // manager state is still loading and the sender can't send any PLAY
          // messages
          self.playerReady_ = true;
          self.maybeSendLoadCompleted_(info);
          if (self.playerAutoPlay_) {
            // Make sure media info is displayed long enough before playback
            // starts.
            self.deferPlay_(sampleplayer.MEDIA_INFO_DURATION_);
            self.playerAutoPlay_ = false;
          }
        });
      }
    });
  }
};

sampleplayer.CastPlayer.prototype.maybeSendLoadCompleted_ = function(info) {
  if (!this.playerReady_) {
    this.log_('Deferring load response, player not ready');
  } else if (!this.metadataLoaded_) {
    this.log_('Deferring load response, loadedmetadata event not received');
  } else {
    this.onMetadataLoadedOrig_(info);
    this.log_('Sent load response, player is ready and metadata loaded');
  }
};

sampleplayer.CastPlayer.prototype.resetMediaElement_ = function() {
  this.log_('resetMediaElement_');
  if (this.player_) {
    this.player_.unload();
    this.player_ = null;
  }
  this.textTrackType_ = null;
};


sampleplayer.CastPlayer.prototype.loadMetadata_ = function(media) {
  this.log_('loadMetadata_');
  if (!sampleplayer.isCastForAudioDevice_()) {
    var metadata = media.metadata || {};
    var titleElement = this.element_.querySelector('.media-title');
    sampleplayer.setInnerText_(titleElement, metadata.title);

    var subtitleElement = this.element_.querySelector('.media-subtitle');
    sampleplayer.setInnerText_(subtitleElement, metadata.subtitle);

    var artwork = sampleplayer.getMediaImageUrl_(media);
    if (artwork) {
      var artworkElement = this.element_.querySelector('.media-artwork');
      sampleplayer.setBackgroundImage_(artworkElement, artwork);
    }
  }
};


sampleplayer.CastPlayer.prototype.loadPreviewModeMetadata_ = function(media) {
  this.log_('loadPreviewModeMetadata_');
  if (!sampleplayer.isCastForAudioDevice_()) {
    var metadata = media.metadata || {};
    var titleElement = this.element_.querySelector('.preview-mode-title');
    sampleplayer.setInnerText_(titleElement, metadata.title);

    var subtitleElement = this.element_.querySelector('.preview-mode-subtitle');
    sampleplayer.setInnerText_(subtitleElement, metadata.subtitle);

    var artwork = sampleplayer.getMediaImageUrl_(media);
    if (artwork) {
      var artworkElement = this.element_.querySelector('.preview-mode-artwork');
      sampleplayer.setBackgroundImage_(artworkElement, artwork);
    }
  }
};


sampleplayer.CastPlayer.prototype.letPlayerHandleAutoPlay_ = function(info) {
  this.log_('letPlayerHandleAutoPlay_: ' + info.message.autoplay);
  var autoplay = info.message.autoplay;
  info.message.autoplay = false;
  this.mediaElement_.autoplay = false;
  this.playerAutoPlay_ = autoplay == undefined ? true : autoplay;
};


sampleplayer.CastPlayer.prototype.loadAudio_ = function(info) {
  this.log_('loadAudio_');
  this.letPlayerHandleAutoPlay_(info);
  this.loadDefault_(info);
};


sampleplayer.CastPlayer.prototype.loadVideo_ = function(info) {
  this.log_('loadVideo_');
  var self = this;
  var protocolFunc = null;
  var url = info.message.media.contentId;
  var protocolFunc = sampleplayer.getProtocolFunction_(info.message.media);
  var wasPreloaded = false;

  this.letPlayerHandleAutoPlay_(info);
  if (!protocolFunc) {
    this.log_('loadVideo_: using MediaElement');
    this.mediaElement_.addEventListener('stalled', this.bufferingHandler_,
        false);
    this.mediaElement_.addEventListener('waiting', this.bufferingHandler_,
        false);
  } else {
    this.log_('loadVideo_: using Media Player Library');

    this.mediaElement_.removeEventListener('stalled', this.bufferingHandler_);
    this.mediaElement_.removeEventListener('waiting', this.bufferingHandler_);

    var loadErrorCallback = function() {
      if (self.player_) {
        self.resetMediaElement_();
        self.mediaElement_.dispatchEvent(new Event('error'));
      }
    };
    if (!this.preloadPlayer_ || (this.preloadPlayer_.getHost &&
        this.preloadPlayer_.getHost().url != url)) {
      if (this.preloadPlayer_) {
        this.preloadPlayer_.unload();
        this.preloadPlayer_ = null;
      }
      this.log_('Regular video load');
      var host = new cast.player.api.Host({
        'url': url,
        'mediaElement': this.mediaElement_
      });
      host.onError = loadErrorCallback;
      this.player_ = new cast.player.api.Player(host);
      this.player_.load(protocolFunc(host));
    } else {
      this.log_('Preloaded video load');
      this.player_ = this.preloadPlayer_;
      this.preloadPlayer_ = null;
      this.player_.getHost().onError = loadErrorCallback;
      this.player_.load();
      wasPreloaded = true;
    }
  }
  this.loadMediaManagerInfo_(info, !!protocolFunc);
  return wasPreloaded;
};

sampleplayer.CastPlayer.prototype.loadMediaManagerInfo_ =
    function(info, loadOnlyTracksMetadata) {

  if (loadOnlyTracksMetadata) {
    this.maybeLoadSideLoadedTracksMetadata_(info);
  } else {
    this.loadDefault_(info);
  }
};

sampleplayer.CastPlayer.prototype.readSideLoadedTextTrackType_ =
    function(info) {
  if (!info.message || !info.message.media || !info.message.media.tracks) {
    return;
  }
  for (var i = 0; i < info.message.media.tracks.length; i++) {
    var oldTextTrackType = this.textTrackType_;
    if (info.message.media.tracks[i].type !=
        cast.receiver.media.TrackType.TEXT) {
      continue;
    }
    if (this.isTtmlTrack_(info.message.media.tracks[i])) {
      this.textTrackType_ =
          sampleplayer.TextTrackType.SIDE_LOADED_TTML;
    } else if (this.isVttTrack_(info.message.media.tracks[i])) {
      this.textTrackType_ =
          sampleplayer.TextTrackType.SIDE_LOADED_VTT;
    } else {
      this.log_('Unsupported side loaded text track types');
      this.textTrackType_ =
          sampleplayer.TextTrackType.SIDE_LOADED_UNSUPPORTED;
      break;
    }
    if (oldTextTrackType && oldTextTrackType != this.textTrackType_) {
      this.log_('Load has inconsistent text track types');
      this.textTrackType_ =
          sampleplayer.TextTrackType.SIDE_LOADED_UNSUPPORTED;
      break;
    }
  }
};


sampleplayer.CastPlayer.prototype.maybeLoadSideLoadedTracksMetadata_ =
    function(info) {
  if (!info.message || !info.message.media || !info.message.media.tracks ||
      info.message.media.tracks.length == 0) {
    return;
  }
  var tracksInfo = ({
    tracks: info.message.media.tracks,
    activeTrackIds: info.message.activeTrackIds,
    textTrackStyle: info.message.media.textTrackStyle
  });
  this.mediaManager_.loadTracksInfo(tracksInfo);
};


sampleplayer.CastPlayer.prototype.maybeLoadEmbeddedTracksMetadata_ =
    function(info) {
  if (!info.message || !info.message.media) {
    return;
  }
  var tracksInfo = this.readInBandTracksInfo_();
  if (tracksInfo) {
    this.textTrackType_ = sampleplayer.TextTrackType.EMBEDDED;
    tracksInfo.textTrackStyle = info.message.media.textTrackStyle;
    this.mediaManager_.loadTracksInfo(tracksInfo);
  }
};


sampleplayer.CastPlayer.prototype.processTtmlCues_ =
    function(activeTrackIds, tracks) {
  if (activeTrackIds.length == 0) {
    return;
  }
  for (var i = 0; i < tracks.length; i++) {
    var contains = false;
    for (var j = 0; j < activeTrackIds.length; j++) {
      if (activeTrackIds[j] == tracks[i].trackId) {
        contains = true;
        break;
      }
    }
    if (!contains ||
        !this.isTtmlTrack_(tracks[i])) {
      continue;
    }
    if (!this.player_) {
      var host = new cast.player.api.Host({
        'url': '',
        'mediaElement': this.mediaElement_
      });
      this.protocol_ = null;
      this.player_ = new cast.player.api.Player(host);
    }
    this.player_.enableCaptions(
        true, cast.player.api.CaptionsType.TTML, tracks[i].trackContentId);
  }
};


sampleplayer.CastPlayer.prototype.isTtmlTrack_ = function(track) {
  return this.isKnownTextTrack_(track,
      sampleplayer.TextTrackType.SIDE_LOADED_TTML,
      sampleplayer.CaptionsMimeType.TTML);
};


sampleplayer.CastPlayer.prototype.isVttTrack_ = function(track) {
  return this.isKnownTextTrack_(track,
      sampleplayer.TextTrackType.SIDE_LOADED_VTT,
      sampleplayer.CaptionsMimeType.VTT);
};


sampleplayer.CastPlayer.prototype.isKnownTextTrack_ =
    function(track, textTrackType, mimeType) {
  if (!track) {
    return false;
  }
  var fileExtension = textTrackType;
  var trackContentId = track.trackContentId;
  var trackContentType = track.trackContentType;
  if ((trackContentId &&
          sampleplayer.getExtension_(trackContentId) === fileExtension) ||
      (trackContentType && trackContentType.indexOf(mimeType) === 0)) {
    return true;
  }
  return false;
};

sampleplayer.CastPlayer.prototype.processInBandTracks_ =
    function(activeTrackIds) {
  var protocol = this.player_.getStreamingProtocol();
  var streamCount = protocol.getStreamCount();
  for (var i = 0; i < streamCount; i++) {
    var trackId = i + 1;
    var isActive = false;
    for (var j = 0; j < activeTrackIds.length; j++) {
      if (activeTrackIds[j] == trackId) {
        isActive = true;
        break;
      }
    }
    var wasActive = protocol.isStreamEnabled(i);
    if (isActive && !wasActive) {
      protocol.enableStream(i, true);
    } else if (!isActive && wasActive) {
      protocol.enableStream(i, false);
    }
  }
};

sampleplayer.CastPlayer.prototype.readInBandTracksInfo_ = function() {
  var protocol = this.player_ ? this.player_.getStreamingProtocol() : null;
  if (!protocol) {
    return null;
  }
  var streamCount = protocol.getStreamCount();
  var activeTrackIds = [];
  var tracks = [];
  for (var i = 0; i < streamCount; i++) {
    var trackId = i + 1;
    if (protocol.isStreamEnabled(i)) {
      activeTrackIds.push(trackId);
    }
    var streamInfo = protocol.getStreamInfo(i);
    var mimeType = streamInfo.mimeType;
    var track;
    if (mimeType.indexOf(sampleplayer.TrackType.TEXT) === 0 ||
        mimeType === sampleplayer.CaptionsMimeType.TTML) {
      track = new cast.receiver.media.Track(
          trackId, cast.receiver.media.TrackType.TEXT);
    } else if (mimeType.indexOf(sampleplayer.TrackType.VIDEO) === 0) {
      track = new cast.receiver.media.Track(
          trackId, cast.receiver.media.TrackType.VIDEO);
    } else if (mimeType.indexOf(sampleplayer.TrackType.AUDIO) === 0) {
      track = new cast.receiver.media.Track(
          trackId, cast.receiver.media.TrackType.AUDIO);
    }
    if (track) {
      track.name = streamInfo.name;
      track.language = streamInfo.language;
      track.trackContentType = streamInfo.mimeType;
      tracks.push(track);
    }
  }
  if (tracks.length === 0) {
    return null;
  }
  var tracksInfo = ({
    tracks: tracks,
    activeTrackIds: activeTrackIds
  });
  return tracksInfo;
};


sampleplayer.CastPlayer.prototype.loadDefault_ = function(info) {
  this.onLoadOrig_(new cast.receiver.MediaManager.Event(
      cast.receiver.MediaManager.EventType.LOAD,
      /** @type {!cast.receiver.MediaManager.RequestData} */ (info.message),
      info.senderId));
};

sampleplayer.CastPlayer.prototype.setIdleTimeout_ = function(t) {
  this.log_('setIdleTimeout_: ' + t);
  var self = this;
  clearTimeout(this.idleTimerId_);
  if (t) {
    this.idleTimerId_ = setTimeout(function() {
      self.receiverManager_.stop();
    }, t);
  }
};

sampleplayer.CastPlayer.prototype.setType_ = function(type, isLiveStream) {
  this.log_('setType_: ' + type);
  this.type_ = type;
  this.element_.setAttribute('type', type);
  this.element_.setAttribute('live', isLiveStream.toString());
  var overlay = this.getElementByClass_('.overlay');
  var watermark = this.getElementByClass_('.watermark');
  clearInterval(this.burnInPreventionIntervalId_);
  if (type != sampleplayer.Type.AUDIO) {
    overlay.removeAttribute('style');
  } else {
    // if we are in 'audio' mode float metadata around the screen to
    // prevent screen burn
    this.burnInPreventionIntervalId_ = setInterval(function() {
      overlay.style.marginBottom = Math.round(Math.random() * 100) + 'px';
      overlay.style.marginLeft = Math.round(Math.random() * 600) + 'px';
    }, sampleplayer.BURN_IN_TIMEOUT);
  }
};

sampleplayer.CastPlayer.prototype.setState_ = function(
    state, opt_crossfade, opt_delay) {
  this.log_('setState_: state=' + state + ', crossfade=' + opt_crossfade +
      ', delay=' + opt_delay);
  var self = this;
  self.lastStateTransitionTime_ = Date.now();
  clearTimeout(self.delay_);
  if (opt_delay) {
    var func = function() { self.setState_(state, opt_crossfade); };
    self.delay_ = setTimeout(func, opt_delay);
  } else {
    if (!opt_crossfade) {
      self.state_ = state;
      self.element_.setAttribute('state', state);
      self.updateApplicationState_();
      self.setIdleTimeout_(sampleplayer.IDLE_TIMEOUT[state.toUpperCase()]);
    } else {
      var stateTransitionTime = self.lastStateTransitionTime_;
      sampleplayer.transition_(self.element_, sampleplayer.TRANSITION_DURATION_,
          function() {
            if (stateTransitionTime < self.lastStateTransitionTime_) {
              self.log_('discarded obsolete deferred state(' + state + ').');
              return;
            }
            self.setState_(state, false);
          });
    }
  }
};

sampleplayer.CastPlayer.prototype.updateApplicationState_ = function() {
  this.log_('updateApplicationState_');
  if (this.mediaManager_) {
    var idle = this.state_ === sampleplayer.State.IDLE;
    var media = idle ? null : this.mediaManager_.getMediaInformation();
    var applicationState = sampleplayer.getApplicationState_(media);
    if (this.currentApplicationState_ != applicationState) {
      this.currentApplicationState_ = applicationState;
      this.receiverManager_.setApplicationState(applicationState);
    }
  }
};

sampleplayer.CastPlayer.prototype.onReady_ = function() {
  this.log_('onReady');
  this.setState_(sampleplayer.State.IDLE, false);
};


sampleplayer.CastPlayer.prototype.onSenderDisconnected_ = function(event) {
  this.log_('onSenderDisconnected');
  // When the last or only sender is connected to a receiver,
  // tapping Disconnect stops the app running on the receiver.
  if (this.receiverManager_.getSenders().length === 0 &&
      event.reason ===
          cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER) {
    this.receiverManager_.stop();
  }
};


sampleplayer.CastPlayer.prototype.onError_ = function(error) {
  this.log_('onError');
  var self = this;
  sampleplayer.transition_(self.element_, sampleplayer.TRANSITION_DURATION_,
      function() {
        self.setState_(sampleplayer.State.IDLE, true);
        self.onErrorOrig_(error);
      });
};

sampleplayer.CastPlayer.prototype.onBuffering_ = function() {
  this.log_('onBuffering[readyState=' + this.mediaElement_.readyState + ']');
  if (this.state_ === sampleplayer.State.PLAYING &&
      this.mediaElement_.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
    this.setState_(sampleplayer.State.BUFFERING, false);
  }
};


sampleplayer.CastPlayer.prototype.onPlaying_ = function() {
  this.log_('onPlaying');
  this.cancelDeferredPlay_('media is already playing');
  var isAudio = this.type_ == sampleplayer.Type.AUDIO;
  var isLoading = this.state_ == sampleplayer.State.LOADING;
  var crossfade = isLoading && !isAudio;
  this.setState_(sampleplayer.State.PLAYING, crossfade);
};

sampleplayer.CastPlayer.prototype.onPause_ = function() {
  this.log_('onPause');
  this.cancelDeferredPlay_('media is paused');
  var isIdle = this.state_ === sampleplayer.State.IDLE;
  var isDone = this.mediaElement_.currentTime === this.mediaElement_.duration;
  var isUnderflow = this.player_ && this.player_.getState()['underflow'];
  if (isUnderflow) {
    this.log_('isUnderflow');
    this.setState_(sampleplayer.State.BUFFERING, false);
    this.mediaManager_.broadcastStatus(/* includeMedia */ false);
  } else if (!isIdle && !isDone) {
    this.setState_(sampleplayer.State.PAUSED, false);
  }
  this.updateProgress_();
};

sampleplayer.CastPlayer.prototype.customizedStatusCallback_ = function(
    mediaStatus) {
  this.log_('customizedStatusCallback_: playerState=' +
      mediaStatus.playerState + ', this.state_=' + this.state_);
  // TODO: remove this workaround once MediaManager detects buffering
  // immediately.
  if (mediaStatus.playerState === cast.receiver.media.PlayerState.PAUSED &&
      this.state_ === sampleplayer.State.BUFFERING) {
    mediaStatus.playerState = cast.receiver.media.PlayerState.BUFFERING;
  }
  return mediaStatus;
};

sampleplayer.CastPlayer.prototype.onStop_ = function(event) {
  this.log_('onStop');
  this.cancelDeferredPlay_('media is stopped');
  var self = this;
  sampleplayer.transition_(self.element_, sampleplayer.TRANSITION_DURATION_,
      function() {
        self.setState_(sampleplayer.State.IDLE, false);
        self.onStopOrig_(event);
      });
};

sampleplayer.CastPlayer.prototype.onEnded_ = function() {
  this.log_('onEnded');
  this.setState_(sampleplayer.State.IDLE, true);
  this.hidePreviewMode_();
};

sampleplayer.CastPlayer.prototype.onAbort_ = function() {
  this.log_('onAbort');
  this.setState_(sampleplayer.State.IDLE, true);
  this.hidePreviewMode_();
};


sampleplayer.CastPlayer.prototype.onProgress_ = function() {
  // if we were previously buffering, update state to playing
  if (this.state_ === sampleplayer.State.BUFFERING ||
      this.state_ === sampleplayer.State.LOADING) {
    this.setState_(sampleplayer.State.PLAYING, false);
  }
  this.updateProgress_();
};

sampleplayer.CastPlayer.prototype.updateProgress_ = function() {
  // Update the time and the progress bar
  if (!sampleplayer.isCastForAudioDevice_()) {
    var curTime = this.mediaElement_.currentTime;
    var totalTime = this.mediaElement_.duration;
    if (!isNaN(curTime) && !isNaN(totalTime)) {
      var pct = 100 * (curTime / totalTime);
      this.curTimeElement_.innerText = sampleplayer.formatDuration_(curTime);
      this.totalTimeElement_.innerText = sampleplayer.formatDuration_(totalTime);
      this.progressBarInnerElement_.style.width = pct + '%';
      this.progressBarThumbElement_.style.left = pct + '%';
      // Handle preview mode
      if (this.displayPreviewMode_) {
        this.previewModeTimerElement_.innerText = "" + Math.round(totalTime-curTime);
      }
    }
  }
};

sampleplayer.CastPlayer.prototype.onSeekStart_ = function() {
  this.log_('onSeekStart');
  clearTimeout(this.seekingTimeoutId_);
  this.element_.classList.add('seeking');
};

sampleplayer.CastPlayer.prototype.onSeekEnd_ = function() {
  this.log_('onSeekEnd');
  clearTimeout(this.seekingTimeoutId_);
  this.seekingTimeoutId_ = sampleplayer.addClassWithTimeout_(this.element_,
      'seeking', 3000);
};


sampleplayer.CastPlayer.prototype.onVisibilityChanged_ = function(event) {
  this.log_('onVisibilityChanged');
  if (!event.isVisible) {
    this.mediaElement_.pause();
    this.mediaManager_.broadcastStatus(false);
  }
};



sampleplayer.CastPlayer.prototype.onPreload_ = function(event) {
  this.log_('onPreload_');
  var loadRequestData =
      /** @type {!cast.receiver.MediaManager.LoadRequestData} */ (event.data);
  return this.preload(loadRequestData.media);
};


sampleplayer.CastPlayer.prototype.onCancelPreload_ = function(event) {
  this.log_('onCancelPreload_');
  this.hidePreviewMode_();
  return true;
};


sampleplayer.CastPlayer.prototype.onLoad_ = function(event) {
  this.log_('onLoad_');
  this.cancelDeferredPlay_('new media is loaded');
  this.load(new cast.receiver.MediaManager.LoadInfo(
 (event.data),
      event.senderId));
};


sampleplayer.CastPlayer.prototype.onEditTracksInfo_ = function(event) {
  this.log_('onEditTracksInfo');
  this.onEditTracksInfoOrig_(event);

  if (!event.data || !event.data.activeTrackIds || !this.textTrackType_) {
    return;
  }
  var mediaInformation = this.mediaManager_.getMediaInformation() || {};
  var type = this.textTrackType_;
  if (type == sampleplayer.TextTrackType.SIDE_LOADED_TTML) {
    if (this.player_) {
      this.player_.enableCaptions(false, cast.player.api.CaptionsType.TTML);
    }
    this.processTtmlCues_(event.data.activeTrackIds,
        mediaInformation.tracks || []);
  } else if (type == sampleplayer.TextTrackType.EMBEDDED) {
    this.player_.enableCaptions(false);
    this.processInBandTracks_(event.data.activeTrackIds);
    this.player_.enableCaptions(true);
  }
};


sampleplayer.CastPlayer.prototype.onMetadataLoaded_ = function(info) {
  this.log_('onMetadataLoaded');
  this.onLoadSuccess_();
 
  this.readSideLoadedTextTrackType_(info);

  if (this.textTrackType_ ==
      sampleplayer.TextTrackType.SIDE_LOADED_TTML &&
      info.message && info.message.activeTrackIds && info.message.media &&
      info.message.media.tracks) {
    this.processTtmlCues_(
        info.message.activeTrackIds, info.message.media.tracks);
  } else if (!this.textTrackType_) {
    
    this.maybeLoadEmbeddedTracksMetadata_(info);
  }

  this.metadataLoaded_ = true;
  this.maybeSendLoadCompleted_(info);
};

sampleplayer.CastPlayer.prototype.onLoadMetadataError_ = function(event) {
  this.log_('onLoadMetadataError_');
  var self = this;
  sampleplayer.transition_(self.element_, sampleplayer.TRANSITION_DURATION_,
      function() {
        self.setState_(sampleplayer.State.IDLE, true);
        self.onLoadMetadataErrorOrig_(event);
      });
};

sampleplayer.CastPlayer.prototype.cancelDeferredPlay_ = function(cancelReason) {
  if (this.deferredPlayCallbackId_) {
    this.log_('Cancelled deferred playback: ' + cancelReason);
    clearTimeout(this.deferredPlayCallbackId_);
    this.deferredPlayCallbackId_ = null;
  }
};

sampleplayer.CastPlayer.prototype.deferPlay_ = function(timeout) {
  this.log_('Defering playback for ' + timeout + ' ms');
  var self = this;
  this.deferredPlayCallbackId_ = setTimeout(function() {
    self.deferredPlayCallbackId_ = null;
    if (self.player_) {
      self.log_('Playing when enough data');
      self.player_.playWhenHaveEnoughData();
    } else {
      self.log_('Playing');
      self.mediaElement_.play();
    }
  }, timeout);
};

sampleplayer.CastPlayer.prototype.onLoadSuccess_ = function() {
  this.log_('onLoadSuccess');
  // we should have total time at this point, so update the label
  // and progress bar
  var totalTime = this.mediaElement_.duration;
  if (!isNaN(totalTime)) {
    this.totalTimeElement_.textContent =
        sampleplayer.formatDuration_(totalTime);
  } else {
    this.totalTimeElement_.textContent = '';
    this.progressBarInnerElement_.style.width = '100%';
    this.progressBarThumbElement_.style.left = '100%';
  }
};

sampleplayer.getMediaImageUrl_ = function(media) {
  var metadata = media.metadata || {};
  var images = metadata['images'] || [];
  return images && images[0] && images[0]['url'];
};

sampleplayer.getProtocolFunction_ = function(mediaInformation) {
  var url = mediaInformation.contentId;
  var type = mediaInformation.contentType || '';
  var path = sampleplayer.getPath_(url) || '';
  if (sampleplayer.getExtension_(path) === 'm3u8' ||
          type === 'application/x-mpegurl' ||
          type === 'application/vnd.apple.mpegurl') {
    return cast.player.api.CreateHlsStreamingProtocol;
  } else if (sampleplayer.getExtension_(path) === 'mpd' ||
          type === 'application/dash+xml') {
    return cast.player.api.CreateDashStreamingProtocol;
  } else if (path.indexOf('.ism') > -1 ||
          type === 'application/vnd.ms-sstr+xml') {
    return cast.player.api.CreateSmoothStreamingProtocol;
  }
  return null;
};


sampleplayer.supportsPreload_ = function(media) {
  return sampleplayer.getProtocolFunction_(media) != null;
};

sampleplayer.canDisplayPreview_ = function(media) {
  var contentId = media.contentId || '';
  var contentUrlPath = sampleplayer.getPath_(contentId);
  if (sampleplayer.getExtension_(contentUrlPath) === 'mp4') {
    return true;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'ogv') {
    return true;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'webm') {
    return true;
  }
  return false;
};


sampleplayer.getType_ = function(media) {
  var contentId = media.contentId || '';
  var contentType = media.contentType || '';
  var contentUrlPath = sampleplayer.getPath_(contentId);
  if (contentType.indexOf('audio/') === 0) {
    return sampleplayer.Type.AUDIO;
  } else if (contentType.indexOf('video/') === 0) {
    return sampleplayer.Type.VIDEO;
  } else if (contentType.indexOf('application/x-mpegurl') === 0) {
    return sampleplayer.Type.VIDEO;
  } else if (contentType.indexOf('application/vnd.apple.mpegurl') === 0) {
    return sampleplayer.Type.VIDEO;
  } else if (contentType.indexOf('application/dash+xml') === 0) {
    return sampleplayer.Type.VIDEO;
  } else if (contentType.indexOf('application/vnd.ms-sstr+xml') === 0) {
    return sampleplayer.Type.VIDEO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'mp3') {
    return sampleplayer.Type.AUDIO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'oga') {
    return sampleplayer.Type.AUDIO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'wav') {
    return sampleplayer.Type.AUDIO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'mp4') {
    return sampleplayer.Type.VIDEO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'ogv') {
    return sampleplayer.Type.VIDEO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'webm') {
    return sampleplayer.Type.VIDEO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'm3u8') {
    return sampleplayer.Type.VIDEO;
  } else if (sampleplayer.getExtension_(contentUrlPath) === 'mpd') {
    return sampleplayer.Type.VIDEO;
  } else if (contentType.indexOf('.ism') != 0) {
    return sampleplayer.Type.VIDEO;
  }
  return sampleplayer.Type.UNKNOWN;
};


sampleplayer.formatDuration_ = function(dur) {
  dur = Math.floor(dur);
  function digit(n) { return ('00' + Math.round(n)).slice(-2); }
  var hr = Math.floor(dur / 3600);
  var min = Math.floor(dur / 60) % 60;
  var sec = dur % 60;
  if (!hr) {
    return digit(min) + ':' + digit(sec);
  } else {
    return digit(hr) + ':' + digit(min) + ':' + digit(sec);
  }
};


sampleplayer.addClassWithTimeout_ = function(element, className, timeout) {
  element.classList.add(className);
  return setTimeout(function() {
    element.classList.remove(className);
  }, timeout);
};


sampleplayer.transition_ = function(element, time, something) {
  if (time <= 0 || sampleplayer.isCastForAudioDevice_()) {
    // No transitions supported for Cast for Audio devices
    something();
  } else {
    sampleplayer.fadeOut_(element, time / 2.0, function() {
      something();
      sampleplayer.fadeIn_(element, time / 2.0);
    });
  }
};

sampleplayer.preload_ = function(media, doneFunc) {
  if (sampleplayer.isCastForAudioDevice_()) {
    doneFunc();
    return;
  }

  var imagesToPreload = [];
  var counter = 0;
  var images = [];
  function imageLoaded() {
      if (++counter === imagesToPreload.length) {
        doneFunc();
      }
  }

  var thumbnailUrl = sampleplayer.getMediaImageUrl_(media);
  if (thumbnailUrl) {
    imagesToPreload.push(thumbnailUrl);
  }
  if (imagesToPreload.length === 0) {
    doneFunc();
  } else {
    for (var i = 0; i < imagesToPreload.length; i++) {
      images[i] = new Image();
      images[i].src = imagesToPreload[i];
      images[i].onload = function() {
        imageLoaded();
      };
      images[i].onerror = function() {
        imageLoaded();
      };
    }
  }
};


sampleplayer.fadeIn_ = function(element, time, opt_doneFunc) {
  sampleplayer.fadeTo_(element, '', time, opt_doneFunc);
};

sampleplayer.fadeOut_ = function(element, time, opt_doneFunc) {
  sampleplayer.fadeTo_(element, 0, time, opt_doneFunc);
};

sampleplayer.fadeTo_ = function(element, opacity, time, opt_doneFunc) {
  var self = this;
  var id = Date.now();
  var listener = function() {
    element.style.webkitTransition = '';
    element.removeEventListener('webkitTransitionEnd', listener, false);
    if (opt_doneFunc) {
      opt_doneFunc();
    }
  };
  element.addEventListener('webkitTransitionEnd', listener, false);
  element.style.webkitTransition = 'opacity ' + time + 's';
  element.style.opacity = opacity;
};


sampleplayer.getExtension_ = function(url) {
  var parts = url.split('.');
  // Handle files with no extensions and hidden files with no extension
  if (parts.length === 1 || (parts[0] === '' && parts.length === 2)) {
    return '';
  }
  return parts.pop().toLowerCase();
};


sampleplayer.getApplicationState_ = function(opt_media) {
  if (opt_media && opt_media.metadata && opt_media.metadata.title) {
    return 'Now Casting: ' + opt_media.metadata.title;
  } else if (opt_media) {
    return 'Now Casting';
  } else {
    return 'Ready To Cast';
  }
};


sampleplayer.getPath_ = function(url) {
  var href = document.createElement('a');
  href.href = url;
  return href.pathname || '';
};

sampleplayer.CastPlayer.prototype.log_ = function(message) {
  if (this.debug_ && message) {
    console.log(message);
  }
};


sampleplayer.setInnerText_ = function(element, opt_text) {
  if (!element) {
    return;
  }
  element.innerText = opt_text || '';
};

sampleplayer.setBackgroundImage_ = function(element, opt_url) {
  if (!element) {
    return;
  }
  element.style.backgroundImage =
      (opt_url ? 'url("' + opt_url.replace(/"/g, '\\"') + '")' : 'none');
  element.style.display = (opt_url ? '' : 'none');
};

sampleplayer.isCastForAudioDevice_ = function() {
  var receiverManager = window.cast.receiver.CastReceiverManager.getInstance();
  if (receiverManager) {
    var deviceCapabilities = receiverManager.getDeviceCapabilities();
    if (deviceCapabilities) {
      return deviceCapabilities['display_supported'] === false;
    }
  }
  return false;
};
