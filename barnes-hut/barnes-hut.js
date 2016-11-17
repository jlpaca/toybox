//SIMULATION PARAMETERS
var WORLD_SIZE = 720;
var dt = 0.05;
var theta = 0.5;
var G = 10;
var epsilon = 1; //gravitational softening

var BHTopti = true; //optimization w/BHT can be turned off for testing purposes
var purge = true;	//purge escaped bodies

$(document).ready(function(){
	$('#world').css({
		'width'	: WORLD_SIZE,
		'height': WORLD_SIZE
	});	

	init();

	//window.setInterval(update, 50);
});

function init(){


	for(var i = 0; i < 600; ++i){
		addRandom();
	}

	window.setInterval(update, 10);
}


//POINT MASS CLASS DEF
function pointMass(i, m, x, v) {
	this.i = i;
	this.m = Math.ceil(m);
	this.radius = Math.ceil(Math.cbrt(this.m)/3);

	this.a = [0, 0];
	this.v = v;
	this.x = x;
	this.prevx = sub(this.x, mul(dt, this.v));


	$('#world').append('<div class = "point-mass"'
	+ 'id = "point-mass-' + this.i
	+ '" style = "'
	
	+ 'width: ' + 2*this.radius + 'px;'
	+ 'height: ' + 2*this.radius + 'px;'

	+ 'transform: translate('
	+ (this.x[0]-this.radius) + 'px, '
	+ (this.x[1]-this.radius) + 'px'
	+ ')'
	+ '"></div>');

	this.elem = $('#point-mass-' + this.i);
}
pointMass.prototype.verlet = function(){
	//verlet //placeholder
	var nextx = sum(sub(mul(2, this.x), this.prevx),
					mul(dt*dt, this.a))
	this.prevx = this.x;
	this.x = nextx;
}
pointMass.prototype.render = function(){
	this.elem.css('transform',
	'translate('
	+ (this.x[0]-this.radius) + 'px, '
	+ (this.x[1]-this.radius) + 'px'
	+ ')')
}


var BHTindex = 0;
var T = [];

//BARNES-HUT TREE CLASS DEF (EMPTY)
function BHT(origin, width){

	this.leaf = true;
	this.i = null; //index of resident body

	this.origin = origin;
	this.width = width;

	this.m = 0;
	this.x = [0, 0];

	this.children = [null, null, null, null]; //new nodes are always empty
}

function BHTbranch(k){
	T[k].leaf = false;
	for(var i = 0; i < 2; ++i){
	for(var j = 0; j < 2; ++j){
		T[BHTindex] = new BHT(
			sum(T[k].origin, 
				[-T[k].width/2 + T[k].width*(i),
				 -T[k].width/2 + T[k].width*(j)]
			),
			T[k].width/2
		);
		T[k].children[2*i + j] = BHTindex;
		++BHTindex;
	}}
}
function BHTinsert(item/*itemindex*/){
	var S = [[item, 0]]; //insert i at node 0

	while(S.length > 0){
		var k = S[S.length-1][1];
		var i = S[S.length-1][0];

		if(k>100){break;}

		S.pop();

		//console.log('insert ' + i + ' @ ' + k);

		var quadrant = [0, 0];
		var quadrantindex = 0;

		if(P[i].x[0] < T[k].origin[0]){quadrant[0] = 0;}
		else{quadrant[0] = 1;}
		if(P[i].x[1] < T[k].origin[1]){quadrant[1] = 0;}
		else{quadrant[1] = 1;}

		quadrantindex = 2*quadrant[0]+quadrant[1];


		if(T[k].m == 0 && T[k].leaf){ //empty external node
			T[k].i = i;
			T[k].m = P[i].m;
			T[k].x = P[i].x;

		} else if (!T[k].leaf){	//internal node

			//update CoM
			T[k].x = mul(1/(T[k].m + P[i].m),
			sum(
				mul(T[k].m, T[k].x),
				mul(P[i].m, P[i].x)
			));
			T[k].m = T[k].m + P[i].m;

			S[S.length] = [i, T[k].children[quadrantindex]];

		} else { //external node occupied by body
			BHTbranch(k);

			//insert body
			S[S.length] = [i, T[k].children[quadrantindex]];
			
			//determine quadrant of resident body
			if(P[T[k].i].x[0] < T[k].origin[0]){quadrant[0] = 0;}
			else{quadrant[0] = 1;}
			if(P[T[k].i].x[1] < T[k].origin[1]){quadrant[1] = 0;}
			else{quadrant[1] = 1;}

			quadrantindex = 2*quadrant[0]+quadrant[1];

			//insert resident body
			S[S.length] = [T[k].i, T[k].children[quadrantindex]]; //but insert T[k].i instead

			//update CoM
			T[k].x = mul(1/(P[i].m + P[T[k].i].m),
				sum(
					mul(P[i].m, P[i].x),
					mul(P[T[k].i].m, P[T[k].i].x)
			));
			T[k].m = P[i].m + P[T[k].i].m;
		
			// mark as internal
			T[k].i = null;
		}
	}
	
}
function BHTcalcaccel(i){
	var S = [0];
	
	while(S.length > 0){
		var k = S[S.length-1]; S.pop();

		if(T[k].leaf){
			if((T[k].i == i) || (T[k].m == 0)){ continue; } //node is self or empty

			P[i].a = sum(
				P[i].a,
				mul(
					G*T[k].m/(epsilon + mag2(sub(T[k].x, P[i].x))),
					unit(sub(T[k].x, P[i].x))
				)
			);

		} else {
			var ratio = T[k].width/mag(sub(T[k].x, P[i].x));
			if(ratio < theta){
				P[i].a = sum(
					P[i].a,
					mul(
						G*T[k].m/(epsilon + mag2(sub(T[k].x, P[i].x))),
						unit(sub(T[k].x, P[i].x))
					)
				);
			} else {
				for(var j = 0; j < 4; ++j){
					S[S.length] = T[k].children[j];
				}
			}
		}
	}
	
}

var itemindex = 0;
var P = []; //list of all point masses, placeholder

function addBody(m, x, v){
	P[itemindex] = new pointMass(itemindex, m, x, v);
	++itemindex;
}
function addRandom(){
	var q;
	var r = WORLD_SIZE;
	while(r > WORLD_SIZE/2) {
	    q = [
		Math.random()*WORLD_SIZE,
		Math.random()*WORLD_SIZE
		];
	var r = Math.sqrt((q[0]-WORLD_SIZE/2)*(q[0]-WORLD_SIZE/2)+(q[1]-WORLD_SIZE/2)*(q[1]-WORLD_SIZE/2));
	}

	P[itemindex] = new pointMass(itemindex,
		Math.random()*1e+2,
		q,
		[Math.random()*8-4, Math.random()*8-4]);
	++itemindex;
}

function update(){
	//purge out-of-bound entries
	for(var i = 0; i < P.length; ++i){
	if(P[i] != null){
		if(purge){
			if((P[i].x[0] >= WORLD_SIZE) || (P[i].x[0] <= 0)
			 ||(P[i].x[1] >= WORLD_SIZE) || (P[i].x[1] <= 0)){

			console.log('! body escaped');
			P[i].elem.remove();
			P[i] = null;
			}
		} else {
			while(P[i].x[0] >= WORLD_SIZE){ P[i].x[0] -= WORLD_SIZE; }
			while(P[i].x[1] >= WORLD_SIZE){ P[i].x[1] -= WORLD_SIZE; }

			while(P[i].x[0] < 0){ P[i].x[0] += WORLD_SIZE; }
			while(P[i].x[1] < 0){ P[i].x[1] += WORLD_SIZE; }
		}
	}}

	//construct BHT at every timestep (memo: possible to dynamically update?)
	if(BHTopti){
		T = [];
		T[0] = new BHT([WORLD_SIZE/2, WORLD_SIZE/2], WORLD_SIZE);
		BHTindex = 1;

		for(var i = 0; i < P.length; ++i){
		if(P[i] != null){
			BHTinsert(i);
		}}
	}

	//calculate forces		
	if(BHTopti){		
		for(var i = 0; i < P.length; ++i){
		if(P[i] != null){
			P[i].a = [0, 0];
			BHTcalcaccel(i);
		}}
	} else {
		for(var i = 0; i < P.length; ++i){
		if(P[i] != null){
			P[i].a = [0, 0];
		}}

		for(var i = 0; i < P.length; ++i){
		for(var j = 0; j < P.length; ++j){
		if(P[i] != null && i != j){
			P[i].a = sum(
				P[i].a,
				mul(
					G*P[j].m/(epsilon + mag2(sub(P[j].x, P[i].x))),
					unit(sub(P[j].x, P[i].x))
				)
			);
		}}}
	}
	//update and render
	for(var i = 0; i < P.length; ++i){
	if(P[i] != null){
		P[i].verlet();
		P[i].render();
	}}
}


//interaction and stuff ?













