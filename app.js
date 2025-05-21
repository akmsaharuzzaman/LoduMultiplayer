
const serverConnect = require("./connection");
const sgdsoft = require("./SGDSOFT_Plugin/SGDSOFT_Plugin.js");
var uuid = require('uuid-random');

let rooms = new Map();

const clients = new Set();

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

serverConnect.wssExport().on('connection', function (ws) {

    ws.setMaxListeners(20); 

    //Connected Server
    sgdsoft.SGDSOFT_WEBSOCKET_On("SGDSOFT@Connected", ws, (ConnectedData) => {
        if (ConnectedData.connect == true) {
            ws.id = uuid();
            ws.ownName = ConnectedData.userName;
            clients.add(ws);
            const userInfo = {
                id: ws.id,
                ownName: ws.ownName
            }
            sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@Connected", userInfo, ws);
            /*const randomInt = getRandomInt(50, 1000) + clients.size;
            setTimeout(() => {
                ws.id = uuid();
                clients.add(ws);
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@Connected", ws.id, ws);
            }, randomInt);*/
        }
    });

    //Join Room
    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@CreateAndJoinRoom', ws, (JoinRoomData) => {
        CreateAndJoinRoom(ws, JoinRoomData.RoomName, JoinRoomData.userLength);
    });

    sgdsoft.SGDSOFT_WEBSOCKET_On('SGDSOFT@Emoji', ws, (EmojiData) => {
        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            rooms[roomKey].clients.forEach((client) => {
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@Emoji", EmojiData, client);
            });
        }
    });

    const events = [
        'SGDSOFT@PiceMove',
        'SGDSOFT@DiceNumberGenearate',
        'SGDSOFT@SwitchHand',
        'SGDSOFT@WinStatusUpdate',
        'SGDSOFT@TimeReset',
        'SGDSOFT@StartMatch',
        'SGDSOFT@StartMatchDelay',
        'SGDSOFT@BetAmount',
        'SGDSOFT@micStatus'
    ];

     events.forEach(event => {
        sgdsoft.SGDSOFT_WEBSOCKET_On(event, ws, (data) => {
            if (ws.room) broadcastToRoom(event, data, ws.room);
        });
    });

    ws.on('close', () => {
        clients.delete(ws);

        const roomKey = ws.room;
        if (roomKey && rooms[roomKey]) {
            const room = rooms[roomKey];
            room.clients = room.clients.filter(client => client !== ws);

            if (room.clients.length == 0 && room.info.locked) {
                rooms.delete(roomKey);
                //delete rooms[roomKey];
            } else {
                Room(roomKey);

                const leftUser = {
                    id: ws.id || "",
                    name: ownName || ""
                };

                room.clients.forEach(client => {
                    sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@LeaveUser", leftUser, client);
                });
            }
        }

    });

});

function broadcastToRoom(event, data, roomKey) {
    if (event == "SGDSOFT@StartMatch") {
        const givenCardCount = data.givenCardCount;
        data.cards = cards.GetRandomCards(givenCardCount);
    }
    const room = rooms[roomKey];
    if (room && room.clients) {
        room.clients.forEach(client => {
            sgdsoft.SGDSOFT_WEBSOCKET_Emit(event, data, client);
        });
    }
}


function CreateAndJoinRoom(ws, requestedRoomKeyOrName, userLength) {

    if (ws.room && rooms[ws.room]) {
        return;
    }

    let targetRoomKey = null;

    for (const key in rooms) {
        const room = rooms[key];
        if (!room.info.locked && room.clients.length < room.info.maxUsers) {
            targetRoomKey = key;
            break;
        }
    }

    if (!targetRoomKey) {
        CreateRoom(ws, requestedRoomKeyOrName, userLength);
        return;
    }

    const room = rooms[targetRoomKey];
    const randomInt = getRandomInt(500, 1000) + room.clients.length;
    setTimeout(() => {
        if (!room.clients.includes(ws)) {
            room.clients.push(ws);
            ws.room = targetRoomKey;
            if (room.clients.length >= room.info.maxUsers) {
                room.info.locked = true;
            }
            Room(targetRoomKey);
        } else {
            }
    }, randomInt);
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
        info: roomInfo,
        startMatch: false,
        play: false
    };

    ws.room = roomKey;

    Room(roomKey);
}

function Room(roomKey) {
    const room = rooms[roomKey];
    if (!room) return;

    const players = room.clients.map((client, index) => ({
        id: client.id,
        serialNumber: index + 1,
        name: client.ownName
    }));

    let ready = false;

    if (room.clients.length > 1 && room.startMatch == false) {
        room.startMatch = true;
        ready = true;
    } else if (room.clients.length == 1 && room.startMatch == true) {
        room.startMatch = false;
    }

    if (room.play == false && room.clients.length == 1) {
        room.info.locked = false;
    }

    const data = {
        type: "RoomInfo",
        params: {
            roomKey: room.info.roomKey,
            roomName: room.info.roomName,
            clientsLength: room.clients.length,
            maxUsers: room.info.maxUsers,
            locked: room.info.locked,
            players: players,
            startMatch: room.startMatch
        }
    };
    room.clients.forEach(client => {
        sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@CreateAndJoinRoom", data, client);
    });

    if (ready) {
        setTimeout(() => {
            if (rooms[roomKey].clients.length > 1) {
                rooms[roomKey].play = true;
                rooms[roomKey].info.locked = true;
                rooms[roomKey].info.maxUsers = rooms[roomKey].clients.length;
                const room = rooms[roomKey];
                if (room && room.clients) {
                    const setData = true;
                    room.clients.forEach(client => {
                        sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@StartMatch", setData, client);
                    });
                }
            } else {
                rooms[roomKey].startMatch = false;
                ready = false;
                Room(roomKey);
            }
        }, 15000);
        gameLoop(15);
    }

    function gameLoop(timeIndex) {
        const start = Date.now();

        if (rooms[roomKey] && rooms[roomKey].clients) {
            if (rooms[roomKey].clients.length === 1) {
                rooms[roomKey].startMatch = false;
                ready = false;
                Room(roomKey);
                return;
            }
            
            rooms[roomKey].clients.forEach(client => {
                sgdsoft.SGDSOFT_WEBSOCKET_Emit("SGDSOFT@StartMatchDelay", timeIndex, client);
            });
        }

        timeIndex -= 1;
        const duration = Date.now() - start;
        const delay = Math.max(0, 1000 - duration);

        if (timeIndex > 0) {
            setTimeout(() => gameLoop(timeIndex), delay);
        }
    }
}

function genKey(length) {
    let _result = '';
    const characters = 'ABCDEFGHIJKLMNOPQUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
        _result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return _result + uuid;
}