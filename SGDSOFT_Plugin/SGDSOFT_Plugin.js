//SGDSOFT_Plugin
const msgpack = require('msgpack-lite');

function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (error) {
        return false;
    }
}

function SGDSOFT_On(_eventName, _webSocket, _callback) {
    if (_webSocket.readyState !== _webSocket.OPEN) {
        return false;
    }
    _webSocket.on('message', function incoming(data) {
        if (isValidJson(data.toString())) {
            const jsonParsed = JSON.parse(data.toString());
            if (_eventName == jsonParsed.SGDSOFT_EventName) {
                return _callback(jsonParsed.SGDSOFT_data);
            }
        } else {
            try{
                const msgpackData = msgpack.decode(data);
                if (_eventName == msgpackData.SGDSOFT_EventName) {
                    const parsedData = JSON.parse(msgpackData.SGDSOFT_data);
                    return _callback(parsedData);
                }
            }catch(err){
                console.error('Invalid MessagePack data', err);
            }
        }
    });
}

function SGDSOFT_Emit(_eventName, _data, _webSocket) {

    if (_webSocket.readyState !== _webSocket.OPEN) {
        return false;
    }

    var _SGDSOFT_Data = {
        'SGDSOFT_EventName': _eventName,
        'SGDSOFT_data': _data
    }

    //const _json_Data = JSON.stringify(_SGDSOFT_Data);
    const _json_Data = msgpack.encode(_SGDSOFT_Data);
    console.log("Size in bytes:", _json_Data.length);
    _webSocket.send(_json_Data);
}

exports.SGDSOFT_WEBSOCKET_On = SGDSOFT_On;
exports.SGDSOFT_WEBSOCKET_Emit = SGDSOFT_Emit;