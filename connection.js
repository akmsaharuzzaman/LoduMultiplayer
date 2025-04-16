const cryptro = require('crypto');
const express = require('express');

const { createServer } = require('http');
const webSocket = require('ws');

const app = express();
const port = 3000;

const server = createServer(app);

const wss = () => { return new webSocket.WebSocketServer({ server }) };

exports.wssExport = wss;

server.listen(port, function () {
    console.log("server running with port : ", port);
});