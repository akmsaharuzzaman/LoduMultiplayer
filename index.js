
const serverConnect = require("./connection");
const sgdsoft = require("./SGDSOFT_Plugin/SGDSOFT_Plugin.js");
var uuid = require('uuid-random');

let rooms = {};

const clients = new Set();

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

serverConnect.wssExport().on('connection', function (ws) {
    //Connected Server
    sgdsoft.SGDSOFT_WEBSOCKET_On("SGDSOFT@Connected", ws, (ConnectedData) => {
        if (ConnectedData.connect == true) {

            const randomInt = getRandomInt(50, 4000) + clients.size;
            console.log("Timeout to Connect: " + randomInt);
            setTimeout(() => {
                ws.id = uuid();
                clients.add(ws);
                console.log("ws connection");
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@Connected", ws.id, ws);
            }, randomInt);
        }
    });

    //Join Room
    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@CreateAndJoinRoom', ws, (JoinRoomData) => {
        console.log("CreateAndJoinRoom...");
        CreateAndJoinRoom(ws, JoinRoomData.RoomName, JoinRoomData.userLength);
    });

    //PiceMove
    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@PiceMove', ws, (PiceMoveData) => {
       /* clients.forEach((client) => {
            sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@PiceMove", PiceMoveData, client);
        });*/
        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            rooms[roomKey].clients.forEach((client) => {
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@PiceMove", PiceMoveData, client);
            });
        }
    });

    //DiceNumberGenearate
    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@DiceNumberGenearate', ws, (DiceNumberGenearate) => {
        /*clients.forEach((client) => {
            sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@DiceNumberGenearate", DiceNumberGenearate, client);
        });*/
        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            rooms[roomKey].clients.forEach(client => {
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@DiceNumberGenearate", DiceNumberGenearate, client);
            });
        }
    });

    //SwitchHand
    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@SwitchHand', ws, (SwitchHand) => {
       /* clients.forEach((client) => {
            sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@SwitchHand", SwitchHand, client);
        });*/
        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            rooms[roomKey].clients.forEach(client => {
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@SwitchHand", SwitchHand, client);
            });
        }
    });

    //WinStatusUpdate
    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@WinStatusUpdate', ws, (WinStatusUpdate) => {
        /*clients.forEach((client) => {
            sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@WinStatusUpdate", WinStatusUpdate, client);
        });*/
        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            rooms[roomKey].clients.forEach(client => {
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@WinStatusUpdate", WinStatusUpdate, client);
            });
        }
    });

    //TimeReset
    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@TimeReset', ws, (TimeReset) => {
        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            rooms[roomKey].clients.forEach(client => {
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@TimeReset", TimeReset, client);
            });
        }
    });

    ws.on('close', () => {
        console.log("Client left id : " + ws.id);
        clients.delete(ws);

        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            const room = rooms[roomKey];
            room.clients = room.clients.filter(client => client !== ws);

            if (room.clients.length < 2 && room.info.locked) {
                console.log("Room has less than 2 members and is locked. Deleting room.");
                delete rooms[roomKey];
            } else {
                Room(roomKey);
            }
        }

    });

});



function CreateAndJoinRoom(ws, requestedRoomKeyOrName, userLength) {

    if (ws.room && rooms[ws.room]) {
        console.log("User is already in a room: ", ws.room);
        return;
    }

    console.log("requestedRoomKeyOrName: ", requestedRoomKeyOrName);
    let targetRoomKey = null;

    for (const key in rooms) {
        const room = rooms[key];
        if (!room.info.locked && room.clients.length < room.info.maxUsers) {
            targetRoomKey = key;
            break;
        }
    }

    if (!targetRoomKey) {
        console.log("No available room found. Creating new one...");
        CreateRoom(ws, requestedRoomKeyOrName, userLength);
        return;
    }

    const room = rooms[targetRoomKey];
    if (!room.clients.includes(ws)) {
        room.clients.push(ws);
        ws.room = targetRoomKey;
        console.log("Joined Room: ", targetRoomKey);
        if (room.clients.length >= room.info.maxUsers) {
            room.info.locked = true;
            console.log("Room locked: " + targetRoomKey);
        }
        Room(targetRoomKey);
    } else {
        console.log("Already in this room");
    }
}

function CreateRoom(ws, roomName, maxUsers) {
    const roomKey = genKey(5);
    const roomInfo = {
        roomKey: roomKey,
        roomName: roomName,
        locked: false,
        maxUsers: maxUsers
    };

    rooms[roomKey] = {
        clients: [ws],
        info: roomInfo
    };

    ws.room = roomKey;

    console.log("Created Room: ", roomKey, " Max Users:", maxUsers);
    Room(roomKey);
}

function Room(roomKey) {
    const room = rooms[roomKey];
    if (!room) return;

    const players = room.clients.map((client, index) => ({
        id: client.id,
        serialNumber: index + 1
    }));

    const data = {
        type: "RoomInfo",
        params: {
            roomKey: room.info.roomKey,
            roomName: room.info.roomName,
            clientsLength: room.clients.length,
            maxUsers: room.info.maxUsers,
            locked: room.info.locked,
            players: players
        }
    };

    room.clients.forEach(client => {
        sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@CreateAndJoinRoom", data, client);
    });
}

function genKey(length) {
    let _result = '';
    const characters = 'ABCDEFGHIJKLMNOPQUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
        _result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return _result + uuid;
}