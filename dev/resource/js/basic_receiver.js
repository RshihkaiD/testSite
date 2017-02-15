window.mediaElement = document.getElementById('receiverMedia');
window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);
window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
window.castReceiverManager.start();
window.castReceiverManager.onSenderDisconnected = function(event){
    if(window.castReceiverManager.getSenders().length == 0 && event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER){
        window.close();
    }
}