var fs = require("fs");
var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

var tests = {
	expected: 1,
	executed: 0,
	finished: function() { tests.executed++; }
};
process.on("exit", function() {
	assert.equal(tests.executed, tests.expected);
	console.log("All done.  Everything passed.");
});

TwoStep(
	function one() {
		check.save(this, arguments);

		this.syncVal("hi");
	},
	function two(err, text) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal("hi");
		this.syncVal(text.toUpperCase());
	},
	function three(err, oriText, newText) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("one")(data);
		check.coverage([ "one", "two", "three" ])(data);
		check.order([ "one", "two", "three" ])(data);
		assert.equal("hi", data["two"].args[1], "Sync val passed");
		assert.equal("hi", data["three"].args[1], "Sync val passed");
		assert.equal("HI", data["three"].args[2], "Second sync val passed");

		tests.finished();
	}
);