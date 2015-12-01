function randomString(length: number = 8) : string {
    // write a better generator
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz".split("");

    if (! length) {
        length = Math.floor(Math.random() * chars.length);
    }

    var str = "";
    for (var i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

(function() {
  var addEvent = (el: any, type: any, fn: any) => {
    if (el && el.nodeName || el === window) {
      el.addEventListener(type, fn, false);
    } else if (el && el.length) {
      for (var i = 0; i < el.length; i++) {
        addEvent(el[i], type, fn);
      }
    }
  };
  var _dragged: any;
  var correctionX: number;
  var correctionY: number;
  (<any>ko.bindingHandlers).drag = {
    init: function(element: any, valueAccessor: any, allBindingsAccessor: any, viewModel: any) {
      element.setAttribute("draggable", "true");
      addEvent(element, "dragstart", function (e: any) {
        e.dataTransfer.setData("data", "data"); // required to drag
        correctionX = e.clientX - viewModel.posX();
        correctionY = e.clientY - viewModel.posY();
        _dragged = viewModel;
      });
    }
  };

  (<any>ko.bindingHandlers).drop = {
    init: function(element: any, valueAccessor: any, allBindingsAccessor: any, viewModel: any) {
      addEvent(element, "dragover", function (e: any) {
        e.preventDefault(); // allows us to drop
        return false;
      });

      addEvent(element, "drop", function (e: any) {
        _dragged.posX(e.clientX - correctionX);
        _dragged.posY(e.clientY - correctionY);
        return false;
      });
    }
  };
})();

interface INote {
  title?: string;
  content?: string;
  posX?: number;
  posY?: number;
}

interface IDictionary<TValue> {
  [id: string]: TValue;
}

interface IBoard {
  name?: string;
  color?: string;
  notes?: IDictionary<INote>;
}

interface INoteVMStyle {
  top: string;
  left: string;
  display: string;
}

class NoteVM {
  id: string;
  title = ko.observable<string>();
  content = ko.observable<string>();
  posX = ko.observable<number>(0);
  posY = ko.observable<number>(0);

  style = ko.computed<INoteVMStyle>(() => {
    var posX = this.posX();
    var posY = this.posY();
    return {
      top: posY ? `${posY}px` : "0",
      left: posX ? `${posX}px` : "0",
      display: posX != null && posY != null  ? "block" : "none"
    };
  });

  update(plain: INote) {
    this.title(plain.title);
    this.content(plain.content);
    this.posX(plain.posX);
    this.posY(plain.posY);
  }

  toPlain(): INote {
    var result = { };
    AddTruthyValue(result, "title", this.title());
    AddTruthyValue(result, "content", this.content());
    AddNumberValue(result, "posX", this.posX());
    AddNumberValue(result, "posY", this.posY());
    return result;
  }
}

function AddTruthyValue(destination: any, key: string, value: any) {
  if (value) {
    destination[key] = value;
  }
}

function AddNumberValue(destination: any, key: string, value: number) {
  if (Object.prototype.toString.call(value) == "[object Number]") {
    destination[key] = value;
  }
}

class BoardVM {
  name = ko.observable<string>();
  color = ko.observable<string>();
  notes = ko.observableArray<NoteVM>([]);

  // TODO: consider to remove this index
  private notesById: IDictionary<NoteVM> = {};

  newNote = () => {
    var note = this.createNote();
    note.posX(0);
    note.posY(0);
    return note;
  };

  createNote(id: string = null) : NoteVM {
    id = id || randomString();
    var note = new NoteVM();
    note.id = id;
    this.notesById[id] = note;
    this.notes.push(note);
    return note;
  }

  deleteNote(id: string) {
    var note = this.notesById[id];
    delete this.notesById[id];
    this.notes.remove(note);
  }

  update(plain: IBoard) {
    this.name(plain.name);
    this.color(plain.color);

    // TODO: update observeble array only a time

    // assuming that json.notes has value
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
  }

  toPlain(): IBoard {
    var result = <IBoard>{ };
    AddTruthyValue(result, "name", this.name());
    AddTruthyValue(result, "color", this.color());
    var noteVMs = this.notes();
    if (noteVMs.length) {
      var notes = <IDictionary<INote>>{};
      for (var i in noteVMs) {
        var noteVM = noteVMs[i];
        notes[noteVM.id] = noteVM.toPlain();
      }
      result.notes = notes;
    }
    return result;
  }
}

var shadowServer = { };
var board = new BoardVM();
board.update(shadowServer);
var shadowClient = board.toPlain();

ko.applyBindings(board);

declare var io : any;

var socket = io();

socket.on("board", function(msg: any){
  if (msg.board) {
    // refresh all the board
  } else if (msg.patch) {
    var current = board.toPlain();
    //console.log({ received_patch1: msg.patch, current: current, shadowServer: shadowServer });
    var serverChanges = msg.patch;
    var myChanges = rfc6902.createPatch(shadowClient, current);
    //console.log({ myChanges: myChanges });
    rfc6902.applyPatch(shadowServer, JSON.parse(JSON.stringify(serverChanges)));
    rfc6902.applyPatch(current, serverChanges);
    rfc6902.applyPatch(current, myChanges);
    //console.log({ received_patch2: msg.patch, current: current, shadowServer: shadowServer });
    board.update(current);
    shadowClient = board.toPlain();
  }
});

var interval = 1000;
setInterval(() => {
  var current = board.toPlain();
  var myChanges = rfc6902.createPatch(shadowServer, current);
  if (myChanges.length) {
    // TODO: consider to send it using HTTP in place of Socket
    socket.emit("board", { patch: myChanges });
    //console.log({ emit_patch: myChanges, current: current, shadowServer: shadowServer });
  }
}, interval);
