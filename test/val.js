var fs = require("fs");
var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

var tests = {
	expected: 4,
	executed: 0,
	finished: function() { tests.executed++; }
};
process.on("exit", function() {
	assert.equal(tests.executed, tests.expected);
	console.log("All done.  Everything passed.");
});

TwoStep(
	function readSelf() {
		check.save(this, arguments);

		fs.readFile(__filename, 'utf8', this.val());
	},
	function capitalize(err, text) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal(text.toUpperCase());
	},
	function showIt(err, newText) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("readSelf")(data);
		check.coverage([ "readSelf", "capitalize", "showIt" ])(data);
		check.order([ "readSelf", "capitalize", "showIt" ])(data);

		var testText = fs.readFileSync(__filename, 'utf8');
		assert.equal(testText, data["capitalize"].args[1], "Text Loaded");
		assert.equal(
			data["capitalize"].args[1].toUpperCase(), data["showIt"].args[1], "Text Uppercased"
		);

		tests.finished();
	}
);

TwoStep(
	function calls() {
		check.save(this, arguments);

		var p1 = this.val(), p2 = this.val();
		setTimeout(function() { p1(null, 1); }, 0);
		setTimeout(function() { p2(null, 2); }, 0);
	},
	function results(err, one, two) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("calls")(data);
		check.coverage([ "calls", "results" ])(data);
		check.order([ "calls", "results" ])(data);
		assert.equal(data["results"].args[1], 1, "First async argument is incorrect");
		assert.equal(data["results"].args[2], 2, "Second async argument is incorrect");

		tests.finished();
	}
);

TwoStep(
	function calls() {
		check.save(this, arguments);

		var p1 = this.val(), p2 = this.val();
		p1(null, 1);
		p2(null, 2);
	},
	function results(err, one, two) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("calls")(data);
		check.coverage([ "calls", "results" ])(data);
		check.order([ "calls", "results" ])(data);
		assert.equal(data["results"].args[1], 1, "First sync argument is incorrect");
		assert.equal(data["results"].args[2], 2, "Second sync argument is incorrect");

		tests.finished();
	}
);

TwoStep(
	function calls() {
		check.save(this, arguments);

		var p1 = this.val();
		setTimeout(function() { p1(null, 1); }, 10);
		this.syncVal(2);
		var p3 = this.val();
		setTimeout(function() { p3(null, 3); }, 0);
	},
	function results(err, one, two, three) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("calls")(data);
		check.coverage([ "calls", "results" ])(data);
		check.order([ "calls", "results" ])(data);
		assert.equal(data["results"].args[1], 1, "First async argument is incorrect");
		assert.equal(data["results"].args[2], 2, "Second sync argument is incorrect");
		assert.equal(data["results"].args[3], 3, "Third async argument is incorrect");

		tests.finished();
	}
);