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
function StepObj(params, steps, curIdx) {
	this._params = params;
	this._steps = steps
	this._curIdx = curIdx;
	this.name = steps[curIdx];
}
StepObj.prototype = {
	val: function(name) {
		var self = this, paramIdx = this._params.nextIdx();
		return function(err, val) {
			if(err) { return self._params.error(err, errInfo(self.name, paramIdx, name)); }

			self._params.done(paramIdx, val);
		}
	},
	valGroup: function(name) {
		name = (name || "group");
		var self = this, paramIdx = this._params.nextIdx();
		var groupVals = new ParamList(function(err) {
			if(err) { return self._params.error(err, errInfo(self.name, paramIdx, err.step.name)); }

			self._params.done(paramIdx, groupVals.vals.slice(1));
		});

		// Handles groups of zero length
		process.nextTick(function() { groupVals.checkPending(); });

		return function val(){
			var valIdx = groupVals.nextIdx();

			return function(err, val) {
				if(err) { return groupVals.error(err, errInfo("", 0, name + "(" + valIdx + ")")); }

				groupVals.done(valIdx, val);
			};
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
	skipTo: function(func) {
		if(Object.prototype.toString.call(func) === "[object Function]") {
			return func(this.name, this._curIdx, this._steps);
		}

		for(var i = 0; i < steps.length; i++) {
			if(steps[i].name !== func) { continue; }

			this._params.next(i);
		}
	}
};

function step2() {
	var steps =  Array.prototype.slice.call(arguments);
	var curIdx = 0;
	var data = {};

	function nextStep(idxOverride) {
		if(curIdx >= steps.length) { return; }

		if(idxOverride != null) { curId = idxOverride; }

		var params = new ParamList(nextStep);
		var stepObj = new StepObj(params, steps, curIdx);

		stepObj.data = data;

		try {
			steps[curIdx++].apply(stepObj, arguments);
			params.checkPending(); // Handle case where nothing async occurs in the step
		} catch(e) {
			params.error(e, { name: steps[curIdx - 1].name });
		}
	}

	nextStep();
}

module.exports = step2;