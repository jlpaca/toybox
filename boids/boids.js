
var WORLD_SIZE = 720;
var CELL_SIZE = 60;
var RANGE = 40; //perception range
var SEPARATION = 12; //separation bound
var MAX_SPEED = 3;
var dt = 1;



function init(){	
	for(var i = 0; i < 460; ++i){ add_random(); }
}

var cursor = [0, 0];
function trackmouse(e){
	var o = $('#world').offset();
	cursor = [e.pageX-o.left, e.pageY-o.top];
}

$(document).ready(function(){
	$('#world').css({width: WORLD_SIZE + 'px',
					height: WORLD_SIZE + 'px'});
	init();
	$('#world').mouseover(function(){fear = Kf;});
	$('#world').mouseleave(function(){fear = 0;});
	$('#world').mousemove(trackmouse);

	window.setInterval(update, 1);
});


var B = []; //boids
var boidindex = 0;

var boid = function(i, x, v){
	this.i = i; //index

	this.neighbourhood = []; //list of indicies of neighbourhood


	this.x = x; //2-vector
	this.v = v; //2-vector
	this.dv = [0, 0];

	$('#world').append('<div id = "boid-'
	+ this.i + '" class = "boid" style = "'
	+ 'transform: translate('
	+ x[0] + 'px, ' + x[1] + 'px) '
	+ 'rotate(' + 0 + 'rad);"></div>');

	this.elem = $('#boid-' + this.i);
}
boid.prototype.calc_dv = function(){
	this.dv = sum(sum(sum(sum(
		mul(Kc, this.cohesion()),
		mul(Ks, this.separation())
		),
		mul(Ka, this.alignment())
		),
		mul(Kn, this.noise())
		),
		mul(Kf, this.fear())
	);
}

boid.prototype.update = function(){
	//sympletic euler
	this.v = clip(MAX_SPEED, sum(this.v, this.dv));
	this.x = sum(this.x, mul(dt, this.v));

	while(this.x[0] >= WORLD_SIZE){ this.x[0] -= WORLD_SIZE; }
	while(this.x[1] >= WORLD_SIZE){ this.x[1] -= WORLD_SIZE; }
	while(this.x[0] < 0){ this.x[0] += WORLD_SIZE; }
	while(this.x[1] < 0){ this.x[1] += WORLD_SIZE; }

}
boid.prototype.render =function(){
	this.elem.css('transform',
	'translate('
	+ this.x[0] + 'px, ' + this.x[1] + 'px) '
	+ 'rotate(' + (Math.atan2(this.v[1],this.v[0])) + 'rad)'
	);
}

//var checks; //debug
boid.prototype.update_neighbourhood = function(){

	var candidates = [];
	var relevant_cells = H.lookup[this.i];
	
	for(var i = 0; i < relevant_cells.length; ++i){
	for(var j = 0; j < H.grid[relevant_cells[i][0]][relevant_cells[i][1]].length; ++j){
		candidates[candidates.length] = H.grid[relevant_cells[i][0]][relevant_cells[i][1]][j];
	}}
	

	/*
	for(var i = 0; i < B.length; ++i){
		candidates[candidates.length] = i;
	}
	*/

	this.neighbourhood = []; //clear
	var inneighbourhood = []; //keep track

	for(var j = 0; j < candidates.length; ++j){
		//++checks;
		if(!inneighbourhood[candidates[j]]&&
		   (B[candidates[j]].i != this.i)&&
		   (mag(sub(this.x, B[candidates[j]].x)) < RANGE)
		  ){
				this.neighbourhood[this.neighbourhood.length] = candidates[j];
				inneighbourhood[candidates[j]] = true;
		} else {
			//too far away to do anything
		}
	}
	
}
//calculation of increments
var Kc = 1e-3;
var Ks = 2;
var Ka = 2e-3;

var Kn = 0.05;
var Kf = 2;
var fear = 0;

boid.prototype.cohesion = function(){
	if(this.neighbourhood.length == 0){ return [0, 0]; }
	var x_CM = [0, 0];
	for(var i = 0; i < this.neighbourhood.length; ++i){
		x_CM = sum(x_CM, B[this.neighbourhood[i]].x);
	}
	x_CM = mul(1/this.neighbourhood.length, x_CM);
	return sub(x_CM, this.x);
}
boid.prototype.separation = function(){
	var steer = [0, 0];
	for(var i = 0; i < this.neighbourhood.length; ++i){
		var dist = mag(sub(this.x, B[this.neighbourhood[i]].x));
		if(dist < SEPARATION){
			steer = mul(1/(dist*dist+1),sub(this.x, B[this.neighbourhood[i]].x));
		}
	}
	return steer;
}
boid.prototype.alignment = function(){
	var v_CM = [0, 0];
	for(var i = 0; i < this.neighbourhood.length; ++i){
		v_CM = sum(v_CM, B[this.neighbourhood[i]].v);
	}
	return v_CM;
}
boid.prototype.noise = function(){
	return [Math.random()-0.5, Math.random()-0.5];
}
boid.prototype.fear = function(){
	var d = sub(this.x, cursor);
	if(fear > 0 && mag(d) < RANGE){
		return mul(1/mag2(d), d);
	}
	return [0, 0];
}


//SPATIAL HASH
var HASH = function(){
	var grid = [];
	var lookup = [];
}
HASH.prototype.clear = function(){ this.grid = []; this.lookup = [];}
HASH.prototype.hash = function(x){ return [Math.floor(x[0]/CELL_SIZE), Math.floor(x[1]/CELL_SIZE)]; }
HASH.prototype.insert = function(index, x){
	var grid_min = this.hash([Math.max(0, x[0]-RANGE),
						 Math.max(0, x[1]-RANGE)]);
	var grid_max = this.hash([Math.min(WORLD_SIZE, x[0]+RANGE),
						 Math.min(WORLD_SIZE, x[1]+RANGE)]);

	for(var i = grid_min[0]; i <= grid_max[0]; ++i){
	for(var j = grid_min[1]; j <= grid_max[1]; ++j){
		if(!this.grid[i]){this.grid[i] = [];}
		if(!this.grid[i][j]){this.grid[i][j] = [];}
		this.grid[i][j][this.grid[i][j].length] = index;

		if(!this.lookup[index]){this.lookup[index] = [];}
		this.lookup[index][this.lookup[index].length] = [i, j];
	}}
}

var H = new HASH();



function add_boid(x, v){
	B[boidindex] = new boid(boidindex, x, v);
	++boidindex;
}
function add_random(){
	B[boidindex] = new boid(boidindex, 
	[Math.random()*WORLD_SIZE,
	 Math.random()*WORLD_SIZE]
	,[Math.random()*10-5,
	 Math.random()*10-5]);
	++boidindex;
}



function update(){

	//update hashmap
	H.clear();
	for(var i = 0; i < B.length; ++i){ H.insert(i, B[i].x); }

	//checks = 0;
	for (var i = 0; i < B.length; ++i){
		B[i].update_neighbourhood();
		B[i].calc_dv();
	}

	for (var i = 0; i < B.length; ++i){
		B[i].update();
		B[i].render();
	}
	//console.log(checks + '/' + B.length*B.length);
}
