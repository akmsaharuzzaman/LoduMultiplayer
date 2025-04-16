//SGDSOFT_Plugin

function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (error) {
        return false;
    }
}

function SGDSOFT_On(_eventName, _webSocket, _callback) {
    _webSocket.on('message', function incoming(data) {
        if (isValidJson(data.toString())) {
            const jsonParsed = JSON.parse(data.toString());
            if (_eventName == jsonParsed.SGDSOFT_EventName) {
                return _callback(jsonParsed.SGDSOFT_data);
            }
        } else {
            console.log("No Json");
        }
    });
}

function SGDSOFT_Emit(_eventName, _data, _webSocket) {

    var _SGDSOFT_Data = {
        'SGDSOFT_EventName': _eventName,
        'SGDSOFT_data': _data
    }

    const _json_Data = JSON.stringify(_SGDSOFT_Data);
    console.log(_json_Data);
    _webSocket.send(_json_Data);
}

exports.SGDSOFT_WEBSOCKET_On = SGDSOFT_On;
exports.SGDSOFT_WEBSOCKET_Emit = SGDSOFT_Emit;