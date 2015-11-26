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
  title: string;
  content: string;
  posX: number;
  posY: number;
}

interface IBoard {
  name: string;
  color: string;
  notes: { [id: string]: INote; };
}

interface INoteVMStyle {
  top: string;
  left: string;
  display: string;
}

class NoteVM {
  id: string;
  title = ko.observable("");
  content = ko.observable("");
  posX = ko.observable<number>();
  posY = ko.observable<number>();

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
    return {
      title: this.title(),
      content: this.content(),
      posX: this.posX(),
      posY: this.posY()
    };
  }
}

class BoardVM {
  name = ko.observable("");
  color = ko.observable("");
  notes = ko.observableArray<NoteVM>([]);

  // TODO: consider to remove this index
  private notesById: { [id: string]: NoteVM; } = {};

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
    var result = <IBoard>{
      name: this.name(),
      color: this.color(),
      notes: {}
    };
    var notes = result.notes;
    for (var i in this.notes()) {
      var noteVM = this.notes()[i];
      notes[noteVM.id] = noteVM.toPlain();
    }
    return result;
  }
}

var board = new BoardVM();

console.log("Applying binding...");

ko.applyBindings(board);

console.log("Add two notes...");

var shadow = <IBoard>{};

board.update(shadow);

declare var io : any;

var socket = io();

var count = 0;
var interval = 1000;
var logInterval = 10000;
setInterval(() => {
  var myChanges = rfc6902.createPatch(shadow, board.toPlain());
  if (myChanges.length) {
    socket.emit("board", { patch: myChanges });
  }
  if (!(count++ % (logInterval / interval))) {
    console.log(myChanges);
  }
}, interval);
