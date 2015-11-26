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
      display: posX && posY ? "block" : "none"
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
    for (var id in plain.notes) {
      var noteVM = this.notesById[id];
      if (!noteVM) {
        noteVM = this.createNote(id);
      }
      noteVM.update(plain.notes[id]);
    }
    for (var id in this.notesById) {
      if (!plain.notes[id]) {
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

var original = <IBoard>{
  color: "#AAAAAA",
  name: "name",
  notes: {
    "abc1": { title: "abc1", content: "string", posX: 10, posY: 20 },
    "abc2": { title: "abc2", content: "zdfdfdsf", posX: 20, posY: 30 }
  }
};

(<any>window).o = original;

board.update(original);

console.log("Edit both notes...");

board.update({
  color: "#AAAAAA",
  name: "name",
  notes: {
    "abc1": { title: "abc1", content: "2", posX: 10, posY: 20 },
    "abc2": { title: "abc2", content: "2", posX: 20, posY: 30 }
  }
});

console.log("Remove a note and add another...");

board.update({
  color: "#AAAAAA",
  name: "name",
  notes: {
    "abc2": { title: "abc2", content: "2", posX: 200, posY: 50 },
    "abc3": { title: "abc1", content: "2", posX: 250, posY: 200 }
  }
});

(<any>window).b = board;

console.log("******************");

var revertPatch = rfc6902.createPatch(board.toPlain(), original);
var revertedBoard = board.toPlain();
rfc6902.applyPatch(revertedBoard, revertPatch);
var shouldBeEmptyPatch = rfc6902.createPatch(revertedBoard, original);
console.log({
  revertPatch: revertPatch,
  currentBoard: board.toPlain(),
  revertedBoard: revertedBoard,
  original: original,
  shouldBeEmptyPatch: shouldBeEmptyPatch });
