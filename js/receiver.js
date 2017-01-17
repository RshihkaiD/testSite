(function(){
	window.mediaElement = document.getElementById('setMedia');
	window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);
	window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
	window.castReceiverManager.start();
})();