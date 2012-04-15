var fs = require("fs");
var assert = require("assert");
var TwoStep = require("../");

var expectations = {};
function expect(message) {
  expectations[message] = new Error("Missing expectation: " + message);
}
function fulfill(message) {
  delete expectations[message];
}
process.addListener('exit', function () {
  Object.keys(expectations).forEach(function (message) {
    throw expectations[message];
  });
});

var selfText = fs.readFileSync(__filename, 'utf8');
expect('callback:one');
expect('callback:two');
expect('callback:three');
TwoStep(
  function readSelf() {
    fulfill("callback:one");
    fs.readFile(__filename, 'utf8', this.val());
  },
  function capitalize(err, text) {
    fulfill("callback:two");
    if (err) throw err;
    assert.equal(selfText, text, "Text Loaded");
    this.syncVal(text.toUpperCase());
  },
  function showIt(err, newText) {
    fulfill("callback:three");
    if (err) throw err;
    assert.equal(selfText.toUpperCase(), newText, "Text Uppercased");
  }
);

var exception = new Error('Catch me!');
expect('error:one');
expect('error:timeout');
expect('error:two');
expect('error:three');
TwoStep(
  function () {
    fulfill('error:one');
    var callback = this.val();
    setTimeout(function () {
      fulfill('error:timeout');
      callback(exception);
    }, 0);
  },
  function (err) {
    fulfill('error:two');
    assert.equal(exception, err, "error should passed through");
    throw exception;
  },
  function (err) {
    fulfill('error:three');
    assert.equal(exception, err, "error should be caught");
  }
);

var dirListing = fs.readdirSync(__dirname),
    dirResults = dirListing.map(function (filename) {
      return fs.readFileSync(__dirname + "/" + filename, 'utf8');
    });

expect('group:one');
expect('group:two');
expect('group:three');
TwoStep(
  function readDir() {
    fulfill('group:one');
    fs.readdir(__dirname, this.val());
  },
  function readFiles(err, results) {
    fulfill('group:two');
    if (err) throw err;
    // Create a new group
    assert.deepEqual(dirListing, results);
    var group = this.valArray();
    results.forEach(function (filename) {
      if (/\.js$/.test(filename)) {
        fs.readFile(__dirname + "/" + filename, 'utf8', group());
      }
    });
  },
  function showAll(err , files) {
    fulfill('group:three');
    if (err) throw err;
    assert.deepEqual(dirResults, files);
  }
);

expect('group:four');
expect('group:five');
// When the group is empty, it should fire with an empty array
TwoStep(
  function start() {
    var group = this.valArray();
    fulfill('group:four');
  },
  function readFiles(err, results) {
    if (err) throw err;
    fulfill('group:five');
    assert.deepEqual(results, []);
  }
);

// Test lock functionality with N sized groups
expect("group:test3: 1");
expect("group:test3: 1,2,3");
expect("group:test3: 2");
TwoStep(
    function() {
        this.syncVal(1);
    },
    function makeGroup(err, num) {
        if(err) throw err;
        fulfill("group:test3: " + num);
        var group = this.valArray();
        setTimeout((function(callback) { return function() { callback(null, 1); } })(group()), 100);
        group()(null, 2);
        setTimeout((function(callback) { return function() { callback(null, 3); } })(group()), 0);
    },
    function groupResults(err, results) {
        if(err) throw err;
        fulfill("group:test3: " + results);
        this.syncVal(2);
    },
    function terminate(err, num) {
        if(err) throw err;
        fulfill("group:test3: " + num);
    }
);

// Test lock functionality with zero sized groups
expect("group:test4: 1");
expect("group:test4: empty array");
expect("group:test4: group of zero terminated");
expect("group:test4: 2");
TwoStep(
    function() {
        this.syncVal(1);
    },
    function makeGroup(err, num) {
        if(err) throw err;
        fulfill("group:test4: " + num);
        this.valArray();
    },
    function groupResults(err, results) {
        if(err) throw err;
        if(results.length === 0) { fulfill("group:test4: empty array"); }
        fulfill('group:test4: group of zero terminated');
        this.syncVal(2);
    },
    function terminate(err, num) {
        if(err) throw err;
        fulfill("group:test4: " + num);
    }
);

// Test lock functionality with groups which return immediately
expect("group:test5: 1,2");
expect("group:test5 t1: 666");
expect("group:test5 t2: 333");
setTimeout(function() {
  TwoStep(
    function parallelCalls() {
      var group = this.valArray();
      var p1 = group(), p2 = group();
      p1(null, 1);
      p2(null, 2);
    },
    function parallelResults(err, results) {
      if(err) throw err;
      fulfill("group:test5: " + results);
      this.syncVal(666);
    },
    function terminate1(err, num) {
      if(err) throw err;
      fulfill("group:test5 t1: " + num);
      var next = this.val();
      setTimeout(function() {
        debugger;
        next(null, 333);
      }, 50);
    },
    function terminate2(err, num) {
      if(err) throw err;
      fulfill("group:test5 t2: " + num);
      this.val();
    }
  );
}, 1000);

var etcText = fs.readFileSync('/etc/passwd', 'utf8');

expect('parallel:one');
expect('parallel:two');
TwoStep(
  // Loads two files in parallel
  function loadStuff() {
    fulfill('parallel:one');
    fs.readFile(__filename, this.val());
    fs.readFile("/etc/passwd", this.val());
  },
  // Show the result when done
  function showStuff(err, code, users) {
    fulfill('parallel:two');
    if (err) throw err;
    assert.equal(selfText, code, "Code should come first");
    assert.equal(etcText, users, "Users should come second");
  }
);

// Test lock functionality with N parallel calls
expect("parallel:test2: 1");
expect("parallel:test2: 1,2,3");
expect("parallel:test2: 2");
TwoStep(
    function() {
        this.syncVal(1);
    },
    function makeParallelCalls(err, num) {
        if(err) throw err;
        fulfill("parallel:test2: " + num);
        
        setTimeout((function(callback) { return function() { callback(null, 1); } })(this.val()), 100);
        this.syncVal(2);
        setTimeout((function(callback) { return function() { callback(null, 3); } })(this.val()), 0);
    },
    function parallelResults(err, one, two, three) {
        if(err) throw err;
        fulfill("parallel:test2: " + [one, two, three]);
        this.syncVal(2);
    },
    function terminate(err, num) {
        if(err) throw err;
        fulfill("parallel:test2: " + num);
    }
)


// Test lock functionality with parallel calls with delay
expect("parallel:test3: 1,2");
expect("parallel:test3 t1: 666");
expect("parallel:test3 t2: 333");
TwoStep(
  function parallelCalls() {
    var p1 = this.val(), p2 = this.val();
    process.nextTick(function() { p1(null, 1); });
    process.nextTick(function() { p2(null, 2); });
  },
  function parallelResults(err, one, two) {
    if(err) throw err;
    fulfill("parallel:test3: " + [one, two]);
    this.syncVal(666);
  },
  function terminate1(err, num) {
    if(err) throw err;
    fulfill("parallel:test3 t1: " + num);
    var next = this.val();
    setTimeout(function() { next(null, 333); }, 50);
  },
  function terminate2(err, num) {
    if(err) throw err;
    fulfill("parallel:test3 t2: " + num);
    this.val();
  }
);


// Test lock functionality with parallel calls which return immediately
expect("parallel:test4: 1,2");
expect("parallel:test4 t1: 666");
expect("parallel:test4 t2: 333");
TwoStep(
  function parallelCalls() {
    var p1 = this.val(), p2 = this.val();
    p1(null, 1);
    p2(null, 2);
  },
  function parallelResults(err, one, two) {
    if(err) throw err;
    fulfill("parallel:test4: " + [one, two]);
    this.syncVal(666);
  },
  function terminate1(err, num) {
    if(err) throw err;
    fulfill("parallel:test4 t1: " + num);
    var next = this.val();
    setTimeout(function() { next(null, 333); }, 50);
  },
  function terminate2(err, num) {
    if(err) throw err;
    fulfill("parallel:test4 t2: " + num);
    this.val();
  }
);