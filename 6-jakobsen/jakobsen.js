var dt = 0.01;

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

	avg = defaultColour;
	
	for(var i = 0; i < this.constraints.length; ++i){
		if (this.constraints[i] instanceof distConstraint){
			avg = this.constraints[i].elem.style.backgroundColor;
			break;
		}
	}
	this.elem.style.backgroundColor = avg;
}
particle.prototype.integrate = function(){
	if(this.i == dragTarget){
		this.q = cursor;
		this.prevq = cursor;
	} else {
		var a = NOG[this.i] ? [0, 0] : g;
		var newq = sum(sub(mul(2, this.q), this.prevq), mul(dt*dt, a));
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

	if (timestepper == null) { // edit mode, edit
		if (e.which == 1) { // LMB: remove particle
			removeP(this.i);
		} else { // RMB: link particles
			if (selP !== null) {
				if (selP.i != this.i){ // no self-constraints
					newC(this, selP);
				}
			} else {
				selP = this;
			}
		}
	} else { // running, start drag
		dragstart(this.i);
	}
}

//colourt = 0;
defaultColour = '#73a1e6';
function colourFromDelta(d){
	hue = Math.max(0.1, 0.6-Math.sqrt(d)*0.5);
	return HSVtoHex(hue, 0.5, 0.9);
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
	magd = mag(d);
	this.elem.style.width =  magd+ 'px';
	this.elem.style.backgroundColor = colourFromDelta(Math.abs(this.L-magd));
}
distConstraint.prototype.solve = function(){
	var d = sub(this.B.q, this.A.q);
	var err = (this.L - mag(d));
	var ratio = this.A.m+this.B.m == 0 ? 0.5 : this.A.m/(this.A.m+this.B.m);
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
	updateNewC();
}
function mousemoveHandler(e){
	updateCursor(e);

	//console.log(cursor);

}
function mouseupHandler(e){
	updateCursor(e);

	dragstop();
}
function mousedownHandler(e){
	updateCursor(e);

	if(e.which > 1 && timestepper == null){
		if(selP !== null){
			newP(1, cursor, [0, 0]);
			newC(selP, P[pindex-1]);
		} else {
			newP(1, cursor, [0, 0]);
		}
	}
}

function keydownHandler(e){
	console.log(e.which);
	if (e.which == 32){ // SPACEBAR
		e.preventDefault();
		timetoggle();
	}
	if (e.which == 27){ // ESC
		e.preventDefault();

		selP = null;
		updateNewC();
	}
}

var W;

var P = []; var pindex = 0;
var C = []; var cindex = 0;
var NOG = []; // particles not influenced by gravity

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
	selP = null;
}
function updateNewC(){
	if (selP === null){
		// do nothing
		newChint.hide();
	} else {
		newChint.show();
		if (ovrP !== null){
			newChint.update(selP.q, ovrP.q);
		} else {
			newChint.update(selP.q, cursor);
		}
	}
}

function removeP(i){
	P[i].elem.parentNode.removeChild(P[i].elem);
	for(var j = 0; j < P[i].constraints.length; ++j){
		if(P[i].constraints[j] != null){
			removeC(P[i].constraints[j].i);
		}
	}
	P[i] = null;
}
function removeC(i){
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
function timestart(){
	selP = null;
	updateNewC();
       	timestepper = window.setInterval(timestep, dt/0.1);
}
function timepause(){
	window.clearInterval(timestepper);
	timestepper = null;
	dragstop();
}
function timetoggle(){
	if(timestepper == null){ timestart(); }
	else { timepause(); selP = null; ovrP = null;  }
}


function newBox(q){
	beginpindex = pindex;
	newP(1, sum(q, [20, 20]), [0, 0]);
	newP(1, sum(q, [-20, 20]), [0, 0]);
	newP(1, sum(q, [-20, -20]), [0, 0]);
	newP(1, sum(q, [20, -20]), [0, 0]);

	newC(P[beginpindex  ], P[beginpindex+1]);
	newC(P[beginpindex+1], P[beginpindex+2]);
	newC(P[beginpindex+2], P[beginpindex+3]);
	newC(P[beginpindex+3], P[beginpindex  ]);

	newC(P[beginpindex  ], P[beginpindex+2]);
	newC(P[beginpindex+1], P[beginpindex+3]);
}
function newMesh(q, r, n){
	var beginpi = pindex;
	newP(0, sum(q, [0, -r]), [0, 0]); NOG[pindex-1] = true;
	newP(0, sum(q, [n*r-r, -r]), [0, 0]); NOG[pindex-1] = true;
	for(var j = 0; j < n; ++j){
	for(var i = 0; i < n; ++i){
		beginpindex = pindex;
		newP(1, sum(q, [i*r, j*r]), [0, 0]);
		if (i > 0){
			newC(P[beginpindex], P[beginpindex-1]);
		}
		if (j > 0){
			newC(P[beginpindex], P[beginpindex-n]);
			//if(i > 0){
			//newC(P[beginpindex], P[beginpindex-n-1]);
			//}
		}
		++beginpindex;
	}}
	newC(P[beginpi], P[beginpi+2]);
	newC(P[beginpi+1], P[beginpi+1+n]);
}

function newPendulum(q, r, n){
	newP(0, q, [0, 0]); NOG[pindex-1] = true;
	for(var i = 1; i < n; ++i){
		newP(1, sum(q, [0, i*r]), [0, 0]);
		newC(P[pindex-1], P[pindex-2]);
	}
	newP(1, sum(q, [-0.4*r, (n+0.4)*r]), [0, 0]);
	newC(P[pindex-1], P[pindex-2]);
	newP(1, sum(q, [+0.4*r, (n+0.4)*r]), [0, 0]);
	newC(P[pindex-1], P[pindex-3]);
	newC(P[pindex-1], P[pindex-2]);
}

function newSphere(q, r, n){
	anginc = 2*Math.PI/n;
	for(i = 0; i < n; ++i){
		newP(1, sum(q, 
		[
		r*Math.sin((i+0.5)*anginc),
		r*Math.cos((i+0.5)*anginc)
		]
		), [0, 0]);
	}
	for(i = 0; i < n-1; ++i){
		newC(P[pindex-i-1], P[pindex-i-2]);
	}
	newC(P[pindex-1], P[pindex-n]);

	for(i = 0; i < n-3; ++i){
		newC(P[pindex-i-1], P[pindex-i-4]);
	}
	newC(P[pindex-1], P[pindex-n+2]);
	newC(P[pindex-2], P[pindex-n+1]);
	newC(P[pindex-3], P[pindex-n  ]);
}
	
function init(){

	//setup
	W = document.getElementById('world');
	newChint = new lineHint();

	W.addEventListener('mousemove', mousemoveHandler);
	W.addEventListener('mousedown', mousedownHandler);
	W.addEventListener('mouseup', mouseupHandler);
	W.addEventListener('contextmenu', function(e){ e.preventDefault(); });
	window.addEventListener('keydown', keydownHandler);


	newBox([100, 600]);
	newBox([200, 600]);
	newBox([300, 600]);

	newMesh([80, 360], 18, 10);

	newPendulum([390, 100], 36, 8);

	newSphere([540, 620], 96, 16);

	timestart()
}

var iters = 12;
function timestep(){
	//colourt += 0.001;
	//if(colourt > 1){ colourt = 0; }
	for(var i = 0; i < P.length; ++i){ if(P[i] != null){ P[i].collide(); }}

	for(var j = 0; j < iters; ++j){
		for(var i = 0; i < C.length; ++i){ if(C[i] != null){ C[i].solve(); }}
	}
	for(var i = 0; i < P.length; ++i){ if(P[i] != null){ P[i].integrate(); }}

	for(var i = 0; i < P.length; ++i){ if(P[i] != null){ P[i].update(); }}
	for(var i = 0; i < C.length; ++i){ if(C[i] != null){ C[i].update(); }}
}
