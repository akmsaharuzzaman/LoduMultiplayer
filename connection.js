const cryptro = require('crypto');
const express = require('express');

const { createServer } = require('http');
const webSocket = require('ws');
const msgpack = require('msgpack-lite');

const app = express();
const port = 3000;

const server = createServer(app);

//const wss = () => { return new webSocket.WebSocketServer({ server }) };
const wss = () => { return new webSocket.Server({
    server,
    maxPayload: 5 * 1024 * 1024,
    perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3, // Optimal balance between speed and compression
          memLevel: 8 // Default memory usage
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024 // 10KB chunks
        },
        clientNoContextTakeover: true, // Prevent memory leaks
        serverNoContextTakeover: true,
        threshold: 512 // Only compress messages > 512 bytes
    },
    clientTracking: true
}) };

exports.wssExport = wss;

server.listen(port, function () {
    console.log("server running with port : ", port);
});