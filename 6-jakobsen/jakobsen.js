var dt = 0.1;

var particle = function(index, mass, coord, velo){
	//parameters
	this.i = index;
	this.m = (mass === 0 ? 0 : 1/mass);
	this.q = coord;
	this.prevq = sub(this.q, mul(dt, velo));

	this.render();
	this.elem = document.getElementById('P' + this.i);

	this.constraints = [];

	this.elem.addEventListener('mouseover', this.mouseoverHandler.bind(this));
	this.elem.addEventListener('mouseout', this.mouseoutHandler.bind(this));
	this.elem.addEventListener('mousedown', this.mousedownHandler.bind(this));
	//this.elem.addEventListener('mouseup', this.mouseupHandler);
}
particle.prototype.render = function(){
	var div = document.createElement('div');
	div.id = "P" + this.i;
	div.className = "particle";
	W.appendChild(div);
}
particle.prototype.update = function(){
	this.elem.style.transform = 'translate(' +
	(this.q[0]-9) + 'px,' + (this.q[1]-9) + 'px)';
}
particle.prototype.integrate = function(){
	if(this.i == dragTarget){
		this.q = cursor;
		this.prevq = cursor;
	} else {
		//var a = [0, 0];
		var newq = sum(sub(mul(2, this.q), this.prevq), mul(dt*dt, g));
		this.prevq = this.q;
		this.q = newq;
	}
}

var boxmargin = 5;
var boxmin = 0   + boxmargin // must be geq this
var boxmax = 720 - boxmargin //must be leq this
particle.prototype.collide = function(){
	//with box: placeholder.
	if(this.q[0] < boxmin){ this.q[0] = boxmin; this.prevq[0] = boxmin; }
	if(this.q[1] < boxmin){ this.q[1] = boxmin; this.prevq[1] = boxmin; }
	if (this.q[0] > boxmax){ this.q[0] = boxmax; this.prevq[0] = boxmax; }
	if (this.q[1] > boxmax){ this.q[1] = boxmax; this.prevq[1] = boxmax; }

}

particle.prototype.mouseoverHandler = function(e){
	updateCursor(e);

	ovrP = this;
	this.elem.className = "particle particleHL";
}
particle.prototype.mouseoutHandler = function(e){
	updateCursor(e);

	ovrP = null;
	this.elem.className = "particle";
}
particle.prototype.mousedownHandler = function(e){
	updateCursor(e);
	
	e.stopPropagation()
	console.log("particle " + this.elem.id + " clicked");

	if (timestepper == null) { // edit mode, edit
		if (e.which == 1) { // LMB: remove particle
			console.log(this.i);
			removeP(this.i);
		} else { // RMB: link particles
			if (selP !== null) {
				console.log('NEW CONSTRAINT');
				console.log(selP);

				if (selP.i != this.i){ // no self-constraints
					newC(this, selP);
				}
				resetNewC();
			} else {
				console.log('SET selP to: ');
				console.log(this);

				selP = this;
				newChint.show();
			}
		}
	} else { // running, start drag
		dragstart(this.i);
	}
}


var distConstraint = function(index, targA, targB){
	this.i = index;
	this.A = targA;
	this.B = targB;

	this.targAi = targA.constraints.length;
	this.targBi = targB.constraints.length;
	targA.constraints[this.targAi] = this;
	targB.constraints[this.targBi] = this;

	this.L = mag(sub(targA.q, targB.q));

	this.render();
	this.elem = document.getElementById('dC' + this.i);
}
distConstraint.prototype.render = function(){
	var d = sub(this.B.q, this.A.q);
	var div = document.createElement('div');
	div.id = "dC" + this.i;
	div.className = "distConstraint";
	W.appendChild(div);
}
distConstraint.prototype.update = function(){
	var d = sub(this.B.q, this.A.q);
	this.elem.style.transform = "translate(" +
		(this.A.q[0]) + "px,"+ (this.A.q[1]) + "px) " +
		"rotate(" + Math.atan2(d[1], d[0]) + "rad )";
	this.elem.style.width =  mag(d) + 'px';
}
distConstraint.prototype.solve = function(){
	var d = sub(this.B.q, this.A.q);
	var err = (this.L - mag(d));
	var ratio = this.A.m/(this.A.m+this.B.m);
	this.A.q = sub(this.A.q, mul(ratio*err, unit(d)));
	this.B.q = sum(this.B.q, mul((1-ratio)*err, unit(d)));
}

var lineHint = function(){

	this.render();
	this.elem = document.getElementById('linehint');
}
lineHint.prototype.render = function(){
	var div = document.createElement('div');
	div.id = 'linehint';
	div.className = 'linehint';
	W.appendChild(div);
}
lineHint.prototype.update = function(x1, x2){
	var d = sub(x1, x2);
	this.elem.style.transform = "translate(" +
		(x2[0]) + "px,"+ (x2[1]) + "px) " +
		"rotate(" + Math.atan2(d[1], d[0]) + "rad )";
	this.elem.style.width =  mag(d) + 'px';
}
lineHint.prototype.hide = function(){
	this.elem.style.visibility = "hidden";
}
lineHint.prototype.show = function(){
	this.update(selP, cursor);
	this.elem.style.visibility = "visible";
}


var cursor = [0, 0];
function updateCursor(e){
	var rect;
	rect = W.getBoundingClientRect();
	cursor = [
		e.clientX - rect.left,
		e.clientY - rect.top
		];
}
function mousemoveHandler(e){
	updateCursor(e);

	//console.log(cursor);

	if (selP !== null) {
		// update new constraint line hint
		if (ovrP !== null){
			newChint.update(selP.q, ovrP.q);
		} else {
			newChint.update(selP.q, cursor);
		}
	}
}
function mouseupHandler(e){
	updateCursor(e);

	dragstop();
}
function mousedownHandler(e){
	updateCursor(e);

	console.log("world clicked");
	if(e.which > 1 && timestepper == null){
		if(selP !== null){
			newP(1, cursor, [0, 0]);
			newC(selP, P[pindex-1]);
		} else {
			newP(1, cursor, [0, 0]);
		}
		resetNewC();
	}
}

function keydownHandler(e){
	console.log(e.which);
	if (e.which == 32){ // SPACEBAR
		timetoggle();
	}
	if (e.which == 27){ // ESC
		resetNewC();
	}
}

var W;

var P = []; var pindex = 0;
var C = []; var cindex = 0;

var selP = null; // last particle selected
var ovrP = null; // mouse over this particle
var newChint = null; // will be initialised when page ready

function newP(m, q, v){
	P[pindex] = new particle(pindex, m, q, v);
	P[pindex].update(); // for feedback during pause
	++pindex;
}
function newC(A, B){
	C[cindex] = new distConstraint(cindex, A, B);
	C[cindex].update();
	++cindex;
}
function resetNewC(){
	selP = null;
	newChint.hide();
}

function removeP(i){
	console.log('REMOVEi P ' + P[i].i);
	P[i].elem.parentNode.removeChild(P[i].elem);
	for(var j = 0; j < P[i].constraints.length; ++j){
		if(P[i].constraints[j] != null){
			removeC(P[i].constraints[j].i);
		}
	}
	P[i] = null;
}
function removeC(i){
	console.log('REMOVE C: ' + C[i].i);
	C[i].elem.parentNode.removeChild(C[i].elem);
	C[i].A.constraints[C[i].targAi] = null;
	C[i].B.constraints[C[i].targBi] = null;
	C[i] = null;
}

var g = [0, 0.04/dt/dt];

var dragTarget = -1; var dragMass = 1;
function dragstart(i){
	dragTarget = i;
	dragMass = P[i].mass;
	P[i].mass = 0;
}
function dragstop(){
	if(dragTarget != - 1){
		P[dragTarget].mass = dragMass;
		dragTarget = -1;
	}
}

var timestepper  = null;
function timestart(){ timestepper = window.setInterval(timestep, 10); }
function timepause(){
	window.clearInterval(timestepper);
	timestepper = null;
	dragstop();
}
function timetoggle(){
	if(timestepper == null){ timestart(); }
	else { timepause(); }
}
	
function init(){

	//setup
	W = document.getElementById('world');
	W.addEventListener('mousemove', mousemoveHandler);
	W.addEventListener('mousedown', mousedownHandler);
	W.addEventListener('mouseup', mouseupHandler);
	W.addEventListener('contextmenu', function(e){ e.preventDefault(); });
	window.addEventListener('keydown', keydownHandler);

	newChint = new lineHint();
	//initial conditions
	// P[pindex] = new particle(pindex, 1, [100, 100], [0, -10]); ++pindex;
	// P[pindex] = new particle(pindex, 1, [200, 200], [0, 0]); ++pindex;
	// P[pindex] = new particle(pindex, 1, [200, 300], [0, 0]); ++pindex;

	// P[pindex] = new particle(pindex, 1, [240, 320], [0, 0]); ++pindex;
	// P[pindex] = new particle(pindex, 1, [240, 280], [0, 0]); ++pindex;

	// C[cindex] = new distConstraint(cindex, P[0], P[1]); ++cindex;
	// C[cindex] = new distConstraint(cindex, P[1], P[2]); ++cindex;

	// C[cindex] = new distConstraint(cindex, P[2], P[3]); ++cindex;
	// C[cindex] = new distConstraint(cindex, P[2], P[4]); ++cindex;
	// C[cindex] = new distConstraint(cindex, P[3], P[4]); ++cindex;


	newP(1, [100, 100], [0, -10]);
	newP(1, [200, 200], [0, 0]);
	newP(1, [200, 300], [0, 0]);

	newP(1, [240, 320], [0, 0]);
	newP(1, [240, 280], [0, 0]);

	newC(P[0], P[1]);
	newC(P[1], P[2]);

	newC(P[2], P[3]);
	newC(P[2], P[4]);
	newC(P[3], P[4]);

	timestart()
}

var iters = 4;
function timestep(){
	for(var i = 0; i < P.length; ++i){ if(P[i] != null){ P[i].collide(); }}

	for(var j = 0; j < iters; ++j){
		for(var i = 0; i < C.length; ++i){ if(C[i] != null){ C[i].solve(); }}
	}
	for(var i = 0; i < P.length; ++i){ if(P[i] != null){ P[i].integrate(); }}

	for(var i = 0; i < P.length; ++i){ if(P[i] != null){ P[i].update(); }}
	for(var i = 0; i < C.length; ++i){ if(C[i] != null){ C[i].update(); }}
}
