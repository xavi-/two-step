function ParamList(step) {
	this.vals = [ null ];
	this.pending = [];
	this.step = step;
	this._idx = 1;
}
ParamList.prototype = {
	nextIdx: function() {
		var idx = this._idx++;

		this.pending.push(idx);

		return idx;
	},
	checkPending: function() {
		if(!this.used && this.pending.length === 0) {
			this.step.apply(null, this.vals);
			this.used = true;
		}
	},
	done: function(idx, val) {
		for(var i = 0; idx != null && i < this.pending.length; i++) {
			if(this.pending[i] !== idx) { continue; }

			this.pending.splice(i, 1);

			break;
		}

		this.vals[idx] = val;
		this.checkPending();
	},
	error: function(err, info) {
		err.step = info;
		this.vals[0] = err;
		this.step.apply(null, this.vals);
	}
};



function errInfo(step, paramIdx, paramName) {
	return { name: step, paramIdx: paramIdx, paramName: paramName };
}
function StepObj(params, jumpTo, name) {
	this._params = params;
	this._jumpTo = jumpTo;
	this.name = name;
}
StepObj.prototype = {
	val: function(name) {
		var self = this, paramIdx = this._params.nextIdx();
		return function(err, val) {
			if(err) { return self._params.error(err, errInfo(self.name, paramIdx, name)); }

			self._params.done(paramIdx, val);
		}
	},
	valArray: function(name) {
		name = (name || "group");
		var self = this, paramIdx = this._params.nextIdx();
		var groupVals = new ParamList(function(err) {
			if(err) { return self._params.error(err, errInfo(self.name, paramIdx, err.step.name)); }

			self._params.done(paramIdx, groupVals.vals.slice(1));
		});

		// Handles groups of zero length
		process.nextTick(function() { groupVals.checkPending(); });

		return {
			val: function(valName) {
				valName = (valName || name + "(" + valIdx + ")");
				var valIdx = groupVals.nextIdx();

				return function(err, val) {
					if(err) { return groupVals.error(err, errInfo("", 0, valName)); }

					groupVals.done(valIdx, val);
				};
			},
			syncVal: function(val, valName) {
				this.val(valName)(null, val);
			}
		};
	},
	syncVal: function(val, name) {
		this.val(name)(null, val);
	},
	listen: function(emitter, name) {
		var self = this, paramIdx = this._params.nextIdx();

		var chunks = [];
		emitter.on('data', function (chunk) { chunks.push(chunk); });
		emitter.on('error', function(err) { self._params.error(err, errInfo(self.name, paramIdx, name)); });
		emitter.on('end', function() { self._params.done(paramIdx, chunks); });
	},
	jumpTo: function(func, args) {
		if(Object.prototype.toString.call(func) === "[object Function]") {
			return func.apply(this, args);
		}

		this._jumpTo(func, args);
	}
};

function TwoStep() {
	var steps =  Array.prototype.slice.call(arguments);
	var curIdx = 0;
	var data = {};

	function jumpTo(name, args) {
		for(var i = 0; i < steps.length; i++) {
			if(steps[i].name !== name) { continue; }

			curIdx = i;

			break;
		}
		nextStep.apply(null, args);
	}

	function nextStep() {
		if(curIdx >= steps.length) { return; }

		var params = new ParamList(nextStep);
		var stepObj = new StepObj(params, jumpTo, steps[curIdx].name);

		stepObj.data = data;

		try {
			steps[curIdx++].apply(stepObj, arguments);
			params.checkPending(); // Handle case where nothing async occurs in the callback
		} catch(e) {
			params.error(e, { name: steps[curIdx - 1].name });
		}
	}

	nextStep();
}

module.exports = TwoStep;