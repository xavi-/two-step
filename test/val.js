var fs = require("fs");
var vows = require("vows");
var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

vows.describe("Test `this.val`").addBatch({
	"basic test passing one param": {
		topic: function() {
			var callback = this.callback;
			TwoStep(
				function readSelf() {
					check.save(this, arguments);

					fs.readFile(__filename, 'utf8', this.val());
					fs.readFile(__filename, 'utf8', this());
				},
				function capitalize(err, text1, text2) {
					if(err) { throw err; }

					check.save(this, arguments);

					this.syncVal(text1.toUpperCase());
				},
				function showIt(err, newText) {
					if(err) { throw err; }

					check.save(this, arguments);

					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("readSelf"),
		"every step called": check.coverage([ "readSelf", "capitalize", "showIt" ]),
		"steps called in order": check.order([ "readSelf", "capitalize", "showIt" ]),
		"check file loaded": function(data) {
			var testText = fs.readFileSync(__filename, 'utf8');
			assert.equal(testText, data["capitalize"].args[1], "Text1 Loaded");
			assert.equal(testText, data["capitalize"].args[2], "Text2 Loaded");
			assert.equal(data["capitalize"].args[1], data["capitalize"].args[2], "Text1 does not equal Text2");
		},
		"check text is capitalize": function(data) {
			assert.equal(data["capitalize"].args[1].toUpperCase(), data["showIt"].args[1], "Text Uppercased");
		}
	},
	"multiple async params test": {
		topic: function() {
			TwoStep(
				function calls() {
					check.save(this, arguments);

					var p1 = this.val(), p2 = this();
					setTimeout(function() { p1(null, 1); }, 0);
					setTimeout(function() { p2(null, 2); }, 0);
				},
				function results(err, one, two) {
					if(err) { throw err; }

					check.save(this, arguments);

					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("calls"),
		"every step called": check.coverage([ "calls", "results" ]),
		"steps called in order": check.order([ "calls", "results" ]),
		"confirm results": function(data) {
			assert.equal(data["results"].args[1], 1, "First async argument is incorrect");
			assert.equal(data["results"].args[2], 2, "Second async argument is incorrect");
		}
	},
	"multiple sync params test": {
		topic: function() {
			TwoStep(
				function calls() {
					check.save(this, arguments);

					var p1 = this.val(), p2 = this();
					p1(null, 1);
					p2(null, 2);
				},
				function results(err, one, two) {
					if(err) { throw err; }

					check.save(this, arguments);

					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("calls"),
		"every step called": check.coverage([ "calls", "results" ]),
		"steps called in order": check.order([ "calls", "results" ]),
		"confirm results": function(data) {
			assert.equal(data["results"].args[1], 1, "First sync argument is incorrect");
			assert.equal(data["results"].args[2], 2, "Second sync argument is incorrect");
		}
	},
	"multiple out of order sync and async params test": {
		topic: function() {
			TwoStep(
				function calls() {
					check.save(this, arguments);

					var p1 = this.val();
					setTimeout(function() { p1(null, 1); }, 10);
					this.syncVal(2);
					var p3 = this();
					setTimeout(function() { p3(null, 3); }, 0);
				},
				function results(err, one, two, three) {
					if(err) { throw err; }

					check.save(this, arguments);

					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("calls"),
		"every step called": check.coverage([ "calls", "results" ]),
		"steps called in order": check.order([ "calls", "results" ]),
		"confirm results": function(data) {
			assert.equal(data["results"].args[1], 1, "First async argument is incorrect");
			assert.equal(data["results"].args[2], 2, "Second sync argument is incorrect");
			assert.equal(data["results"].args[3], 3, "Third async argument is incorrect");
		}
	}
}).export(module);