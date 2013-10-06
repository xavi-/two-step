var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

var tests = {
	expected: 3,
	executed: 0,
	finished: function() { tests.executed++; }
};
process.on("exit", function() {
	assert.equal(tests.executed, tests.expected);
	console.log("All done.  Everything passed.");
});

TwoStep(
	function start(err) {
		check.save(this, arguments);
		this.jumpTo("last", [ err, "hello" ]);
	},
	function skip(err) {
		check.save(this, arguments);
	},
	function last(err) {
		check.save(this, arguments);
		this.syncVal(this.data);
	},
	function date(err, data) {
		if(err) { throw err; }

		check.emptyArgs("start")(data);
		check.coverage([ "start", "last" ])(data);
		check.order([ "start", "last" ])(data);
		assert.ok(!data["skip"], "The skipped callback was executed");
		assert.ok(!data["last"].args[0], "The error argument was incorrectly set");
		assert.equal(data["last"].args[1], "hello", "The incorrect arguments were sent");

		tests.finished();
	}
);

TwoStep(
	function first(err) {
		check.save(this, arguments);
		this.jumpTo("fourth", [ err, "go to fourth" ]);
	},
	function second(err) {
		check.save(this, arguments);
		this.syncVal("foo");
	},
	function third(err) {
		check.save(this, arguments);
		this.jumpTo("fifth", [ err, "go to fifth" ]);
	},
	function fourth(err) {
		check.save(this, arguments);
		this.jumpTo("second", [ err, "go to second" ]);
	},
	function fifth(err) {
		check.save(this, arguments);
		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("first")(data);
		check.coverage([ "first", "second", "third", "fourth", "fifth" ])(data);
		check.order([ "first", "fourth", "second", "third", "fifth" ])(data);
		assert.ok(!data["second"].args[0], "The error argument was incorrectly set");
		assert.equal(data["second"].args[1], "go to second", "The incorrect arguments were sent");
		assert.equal(data["third"].args[1], "foo", "The incorrect arguments were sent");
		assert.equal(data["fourth"].args[1], "go to fourth", "The incorrect arguments were sent");
		assert.equal(data["fifth"].args[1], "go to fifth", "The incorrect arguments were sent");

		tests.finished();
	}
);

function done(err, data) {
	if(err) { throw err; }

	check.emptyArgs("start")(data);
	check.coverage([ "start" ])(data);
	assert.ok(!data["skip1"], "First skipped callback was executed");
	assert.ok(!data["skip2"], "Second skipped callback was executed");
	assert.ok(data.exited, "External jumpTo function was executed.");
	assert.deepEqual(data.exitArgs, ['foo', 'bar', 'baz']);

	tests.finished();
}
function exit() {
	this.data.exited = true;
	this.data.exitArgs = Array.prototype.slice.call(arguments);
	done(null, this.data);
}
TwoStep(
	function start() {
		check.save(this, arguments);
		this.jumpTo(exit, ['foo', 'bar', 'baz']);
	},
	function skip1() {
		check.save(this, arguments);
	},
	function skip2() {
		check.save(this, arguments);

		this.syncVal(this.data);
	},
	done
);
