"use strict";
class Migration {
    up(callback) {
        this._up = callback;
    }
    down(callback) {
        this._down = callback;
    }
    convertToStandardFormat() {
        return {
            up: this._up,
            down: this._down
        };
    }
}

module.exports = Migration;