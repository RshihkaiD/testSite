"use strict";

window.castReceiverManager = null;
window.mediaElement = null;
window.mediaManager = null;
window.messageBus = null;
window.mediaHost = null;
window.mediaProtocol = null;
window.mediaPlayer = null;
window.connectedSenders = [];

var castMessageProcessing(elementName, castMessage) {
    // pring cast message to float block
    document.getElementById(elementName).innerHTML = '' + JSON.stringify(castMessage);
}

var sendMessageLogToConsole(status, info) {
    console.dir('฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿฿', status, info);
}

window.mediaElement = document.getElementById('videoReceiver');
window.mediaElement.autoplay = true; // set default is auto play.

console.log('+ Application is loaded. system is Starting.');
castMessageProcessing('applicationStatus', 'Is loading, Starting up...');

/*
 * set log information level
 */
cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);

//include cast receiver
window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();

//receiver is ready.
window.castReceiverManager.onReady = function (event) {
    console.info('! Receiver Manager: ready.');
    castMessageProcessing('receiverMessageManager', 'Ready' + JSON.stringify(event));
    castMessageProcessing('applicationStatus', "Load's status is ready.");
    sendMessageLogToConsole('Ready', JSON.stringify(event));
}

//receiver connected senders.
window.castReceiverManager.onSenderConnected = function (event) {
    console.info('! Receiver Manager: connected.');
    castMessageProcessing('receiverMessageManager', 'Sender is connected');
    connectedSenders = [];
    connectedSenders.push(castReceiverManager.getSenders());
    castMessageProcessing('sessionCount', '' + connectedSenders.length);
    sendMessageLogToConsole('connected', JSON.stringify(event));
}

//receiver disconnected senders.
window.castReceiverManager.onSenderDisconnected = function (event) {
    console.warn('X Receiver Manager: diconnected.');
    castMessageProcessing('receiverMessageManager', 'Sender is disconnected');
    connectedSenders = [];
    connectedSenders.push(castReceiverManager.getSenders());
    castMessageProcessing('sessionCount', '' + connectedSenders.length);
    if (connectedSenders.length <= 0 && event.reason == cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER) {
        window.close();
    }
    sendMessageLogToConsole('diconnected', JSON.stringify(event));
}

window.castReceiverManager.onSystemVolumeChanged = function (event) {
    console.info('! Receiver Manager: Volume changed.');
    castMessageProcessing('receiverMessageManager', 'Volume is change.');

    //get volume chage level & information
    sendMessageLogToConsole('volume changed.', JSON.stringify(event));
    castMessageProcessing('receiverMessageManager', 'Volume is change.');
    castMessageProcessing('volumeMessage', 'Level: ' + event.data['level'] + ' -- muted? ' + event.data['muted']);
}

window.castReceiverManager.onVisibilityChanged = function (event) {
    console.info('! Receiver Manager: Visibility changed.');
    castMessageProcessing('receiverMessageManager', 'visibility is changed.');

    if (event.data) {
        window.mediaElement.play();
        window.clearTimeout(window.timeout);
        window.timeout = null;
    } else {
        window.mediaElement.pause();
        window.timeout = window.setTimeout(function () {
            window.close();
        }, 300000);//5 minute timeout to check.
    }
}

// setting message bus
window.messageBus = window.castReceiverManager.getCastMessageBus('urn:ccast:com.testwebsite.castbuild');

