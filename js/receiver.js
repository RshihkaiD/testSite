(function() {
    window.mediaElement = document.getElementById('setMedia');
    window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);
    var namespace = 'urn:x-cast:com.super.example';
    var messageBus = castReceiverManager.getCastMessageBus(namespace, cast.receiver.CastMessageBus.MessageType.JSON);

    messageBus.onMessage = function(event) {
        var sender = event.senderId;
        var message = event.data;
        console.log('received message!');
    };
    window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();

    window.castReceiverManager.start();

    window.castReceiverManager.onSenderDisconnected = function(event) {
        if (window.castReceiverManager.getSenders().length == 0 &&
            event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER) {
            window.close();
        }
    }

    /* -- API Config -- */
    var apiConfig = new cast.receiver.CastReceiverManager.Config();
    apiConfig.statusText = '準備播放';
    apiConfig.maxInactivity = 6000;
    window.castReceiverManager.start(apiConfig);



})();
