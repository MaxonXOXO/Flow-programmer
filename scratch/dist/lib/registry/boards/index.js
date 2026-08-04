"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESP32 = exports.ArduinoUno = void 0;
exports.getBoardDefinition = getBoardDefinition;
exports.getPinCapabilities = getPinCapabilities;
exports.pinSupports = pinSupports;
const arduino_uno_1 = require("./arduino_uno");
const esp32_1 = require("./esp32");
const BOARD_REGISTRY = {
    arduino_uno: arduino_uno_1.ArduinoUno,
    esp32: esp32_1.ESP32,
};
function getBoardDefinition(boardId) {
    const normalizedId = boardId.toLowerCase().replace(/-/g, '_');
    return BOARD_REGISTRY[normalizedId] || BOARD_REGISTRY['arduino_uno'];
}
function getPinCapabilities(boardId, pin) {
    const board = getBoardDefinition(boardId);
    if (!board)
        return [];
    const pinDef = board.pins[pin];
    return pinDef ? pinDef.capabilities : [];
}
function pinSupports(boardId, pin, capability) {
    const capabilities = getPinCapabilities(boardId, pin);
    return capabilities.includes(capability);
}
__exportStar(require("./types"), exports);
var arduino_uno_2 = require("./arduino_uno");
Object.defineProperty(exports, "ArduinoUno", { enumerable: true, get: function () { return arduino_uno_2.ArduinoUno; } });
var esp32_2 = require("./esp32");
Object.defineProperty(exports, "ESP32", { enumerable: true, get: function () { return esp32_2.ESP32; } });
