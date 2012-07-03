var fs = require("fs");
var vows = require("vows");
var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

vows.describe("Test `this.valArray`").addBatch({
	"basic valArray test reading directories": {
		topic: function() {
			TwoStep(
				function readDir() {
					check.save(this, arguments);
					fs.readdir(__dirname, this.val());
				},
				function readFiles(err, results) {
					if(err) { throw err; }

					check.save(this, arguments);

					var files1 = this.valArray();
					var files2 = this.valArray();
					results.forEach(function (filename) {
						if (/\.js$/.test(filename)) {
							fs.readFile(__dirname + "/" + filename, 'utf8', files1.val());
							fs.readFile(__dirname + "/" + filename, 'utf8', files2.val());
						}
					});
				},
				function showAll(err, files1, files2) {
					if(err) { throw err; }

					check.save(this, arguments);

					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("readDir"),
		"every step called": check.coverage([ "readDir", "readFiles", "showAll" ]),
		"steps called in order": check.order([ "readDir", "readFiles", "showAll" ]),
		"check results": function(data) {
			var dirListing = fs.readdirSync(__dirname);
			var dirResults = dirListing.map(function (filename) {
				return fs.readFileSync(__dirname + "/" + filename, 'utf8');
			});

			assert.deepEqual(data["readFiles"].args[1], dirListing);
			assert.deepEqual(data["showAll"].args[1], dirResults);
			assert.deepEqual(data["showAll"].args[2], dirResults);
			assert.deepEqual(data["showAll"].args[1], data["showAll"].args[2]);
		}
	},
	"test empty valArray": {
		topic: function() {
			TwoStep(
				function calls() {
					check.save(this, arguments);
					this.valArray();
				},
				function results(err, arr) {
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
		"check results": function(data) {
			assert.deepEqual(data["results"].args[1], [], "Empty valArray didn't result in empty array");
		}
	},
	"test sync calls to valArray async callbacks": {
		topic: function() {
			TwoStep(
				function calls() {
					check.save(this, arguments);

					var group = this.valArray();
					var p1 = group.val(), p2 = group();
					p1(null, 1);
					p2(null, 2);
				},
				function results(err, arr) {
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
		"check results": function(data) {
			assert.deepEqual(data["results"].args[1], [ 1, 2 ], "Results array from sync values is incorrect");
		}
	},
	"test mixed sync and async values": {
		topic: function() {
			TwoStep(
				function calls(err, num) {
					check.save(this, arguments);

					var group = this.valArray();
					var p1 = group.val();
					setTimeout(function() { p1(null, 1); }, 10);
					group.syncVal(2);
					var p3 = group();
					setTimeout(function() { p3(null, 3); }, 0);
				},
				function results(err, arr) {
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
		"check results": function(data) {
			assert.deepEqual(
				data["results"].args[1], [ 1, 2, 3 ],
				"Results array from mixed sync and async values is incorrect"
			);
		}
	},
	"multi-valArray with mixed sync and async values": {
		topic: function() {
			TwoStep(
				function calls(err, num) {
					check.save(this, arguments);

					var group1 = this.valArray();
					var g1p1 = group1.val();
					setTimeout(function() { g1p1(null, 1); }, 10);
					group1.syncVal(2);
					var g1p3 = group1();
					setTimeout(function() { g1p3(null, 3); }, 0);

					var group2 = this.valArray();
					var g2p1 = group2.val(), g2p2 = group2(), g2p3 = group2.val();
					setTimeout(function() { g2p1(null, "a"); }, 0);
					setTimeout(function() { g2p2(null, "b"); }, 0);
					setTimeout(function() { g2p3(null, "c"); }, 0);
				},
				function results(err, results1, results2) {
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
		"check results": function(data) {
			assert.deepEqual(
				data["results"].args[1], [ 1, 2, 3 ],
				"Results array with mixed sync and async values is incorrect"
			);
			assert.deepEqual(
				data["results"].args[2], [ "a", "b", "c" ],
				"Results array from mixed sync and async values is incorrect"
			);
		}
	}
}).export(module);