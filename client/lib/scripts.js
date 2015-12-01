var Greeter = (function () {
    function Greeter(message) {
        this.greeting = message;
    }
    Greeter.prototype.greet = function () {
        return "Bonjour, " + this.greeting + "!";
    };
    return Greeter;
})();
function randomString(length) {
    if (length === void 0) { length = 8; }
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz".split("");
    if (!length) {
        length = Math.floor(Math.random() * chars.length);
    }
    var str = "";
    for (var i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}
(function () {
    var addEvent = function (el, type, fn) {
        if (el && el.nodeName || el === window) {
            el.addEventListener(type, fn, false);
        }
        else if (el && el.length) {
            for (var i = 0; i < el.length; i++) {
                addEvent(el[i], type, fn);
            }
        }
    };
    var _dragged;
    var correctionX;
    var correctionY;
    ko.bindingHandlers.drag = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            element.setAttribute("draggable", "true");
            addEvent(element, "dragstart", function (e) {
                e.dataTransfer.setData("data", "data");
                correctionX = e.clientX - viewModel.posX();
                correctionY = e.clientY - viewModel.posY();
                _dragged = viewModel;
            });
        }
    };
    ko.bindingHandlers.drop = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            addEvent(element, "dragover", function (e) {
                e.preventDefault();
                return false;
            });
            addEvent(element, "drop", function (e) {
                _dragged.posX(e.clientX - correctionX);
                _dragged.posY(e.clientY - correctionY);
                return false;
            });
        }
    };
})();
var NoteVM = (function () {
    function NoteVM() {
        var _this = this;
        this.title = ko.observable();
        this.content = ko.observable();
        this.posX = ko.observable(0);
        this.posY = ko.observable(0);
        this.style = ko.computed(function () {
            var posX = _this.posX();
            var posY = _this.posY();
            return {
                top: posY ? posY + "px" : "0",
                left: posX ? posX + "px" : "0",
                display: posX != null && posY != null ? "block" : "none"
            };
        });
    }
    NoteVM.prototype.update = function (plain) {
        this.title(plain.title);
        this.content(plain.content);
        this.posX(plain.posX);
        this.posY(plain.posY);
    };
    NoteVM.prototype.toPlain = function () {
        var result = { id: this.id };
        AddTruthyValue(result, "title", this.title());
        AddTruthyValue(result, "content", this.content());
        AddNumberValue(result, "posX", this.posX());
        AddNumberValue(result, "posY", this.posY());
        return result;
    };
    return NoteVM;
})();
function AddTruthyValue(destination, key, value) {
    if (value) {
        destination[key] = value;
    }
}
function AddNumberValue(destination, key, value) {
    if (Object.prototype.toString.call(value) == "[object Number]") {
        destination[key] = value;
    }
}
var BoardVM = (function () {
    function BoardVM() {
        var _this = this;
        this.name = ko.observable();
        this.color = ko.observable();
        this.notes = ko.observableArray([]);
        this.notesById = {};
        this.newNote = function () {
            var note = _this.createNote();
            note.posX(0);
            note.posY(0);
            return note;
        };
    }
    BoardVM.prototype.createNote = function (id) {
        if (id === void 0) { id = null; }
        id = id || randomString();
        var note = new NoteVM();
        note.id = id;
        this.notesById[id] = note;
        this.notes.push(note);
        return note;
    };
    BoardVM.prototype.deleteNote = function (id) {
        var note = this.notesById[id];
        delete this.notesById[id];
        this.notes.remove(note);
    };
    BoardVM.prototype.update = function (plain) {
        this.name(plain.name);
        this.color(plain.color);
        var notes = plain.notes || {};
        for (var id in notes) {
            var noteVM = this.notesById[id];
            if (!noteVM) {
                noteVM = this.createNote(id);
            }
            noteVM.update(notes[id]);
        }
        for (var id in this.notesById) {
            if (!notes[id]) {
                this.deleteNote(id);
            }
        }
    };
    BoardVM.prototype.toPlain = function () {
        var result = {};
        AddTruthyValue(result, "name", this.name());
        AddTruthyValue(result, "color", this.color());
        var noteVMs = this.notes();
        if (noteVMs.length) {
            var notes = {};
            for (var i in noteVMs) {
                var noteVM = noteVMs[i];
                notes[noteVM.id] = noteVM.toPlain();
            }
            result.notes = notes;
        }
        return result;
    };
    return BoardVM;
})();
var shadowServer = {};
var board = new BoardVM();
board.update(shadowServer);
var shadowClient = board.toPlain();
ko.applyBindings(board);
var socket = io();
socket.on("board", function (msg) {
    if (msg.board) {
    }
    else if (msg.patch) {
        var current = board.toPlain();
        var myChanges = rfc6902.createPatch(shadowClient, current);
        rfc6902.applyPatch(shadowServer, JSON.parse(JSON.stringify(msg.patch)));
        rfc6902.applyPatch(current, JSON.parse(JSON.stringify(msg.patch)));
        rfc6902.applyPatch(current, JSON.parse(JSON.stringify(myChanges)));
        board.update(current);
        shadowClient = board.toPlain();
    }
});
var interval = 1000;
setInterval(function () {
    var current = board.toPlain();
    var myChanges = rfc6902.createPatch(shadowServer, current);
    if (myChanges.length) {
        shadowClient = current;
        socket.emit("board", { patch: myChanges });
    }
}, interval);
