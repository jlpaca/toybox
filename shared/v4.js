// adds functions to Array object for vector arithmetic.
var V4_EPSILON = 1e-6;
function v4fromTHREEVector3(v){
	return [v.x, v.y, v.z, 1];
}
function v4clone(v){ return [v[0], v[1], v[2], 1]; }
function v4add(u, v){ return [u[0]+v[0], u[1]+v[1], u[2]+v[2], 1]; }
function v4sub(u, v){ return [u[0]-v[0], u[1]-v[1], u[2]-v[2], 1]; }
function v4mul(a, v){ return [a*v[0], a*v[1], a*v[2], 1]; }
function v4mag(v){ return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); }
function v4mag2(v){ return v[0]*v[0]+v[1]*v[1]+v[2]*v[2]; }
function v4epsilon(v) { return Math.abs(v4mag(v)) < V4_EPSILON; }
function v4unit(v) {
	if (v4epsilon(v)) { return [0, 0, 0, 1]; }
	var m = 1/v4mag(v); return v4mul(m, v);
}
function v4dot(u, v){ return u[0]*v[0]+u[1]*v[1]+u[2]*v[2]; }
function v4x(u, v){
	return [u[1]*v[2]-u[2]*v[1],
		u[2]*v[0]-u[0]*v[2],
		u[0]*v[1]-u[1]*v[0],
		1];
}

function v4ang(v, u, n){
	// returns a result between + and - PI. If n is provided,
	// angles are calculated CCW wrt n.
	var x = v4x(u, v);
	var ang = Math.atan2(v4mag(x), v4dot(u, v));
	if (n && !v4epsilon(n)) {
		return (v4dot(x, n) < 0 ? -ang : ang);
	}
	return ang;
}

function v4projontoplane(u, n){
	//var normalcomponent = v4mul(v4dot(u, n), n);
	return v4sub(u, v4mul(v4dot(u, n), n));
}
function v4projontovector(u, v){
	return v4mul(v4dot(u, v)/v4mag2(v), v);
}

Array.prototype.v4fromTHREEVector3 = function(v){
	this[0] = v.x; this[1] = v.y;
	this[2] = v.z; this[3] = 1;
	return this;
}

Array.prototype.v4clone = function(v){
	return [this[0], this[1], this[2], 1];
}
Array.prototype.v4set = function(x, y, z){
	this[0] = x; this[1] = y; this[2] = z;
	return this;
}
Array.prototype.v4add = function(v){
	this[0] += v[0]; this[1] += v[1];
	this[2] += v[2]; this[3] = 1;
	return this;
}
Array.prototype.v4sub = function(v){
	this[0] -= v[0]; this[1] -= v[1];
	this[2] -= v[2]; this[3] = 1;
	return this;
}
Array.prototype.v4mul = function(a){
	this[0] *= a; this[1] *= a;
	this[2] *= a; this[3] = 1;
	return this;
}

Array.prototype.v4mag = function(){
	return Math.sqrt(this[0]*this[0]+this[1]*this[1]+this[2]*this[2]);
}
Array.prototype.v4mag2 = function(){
	return this[0]*this[0]+this[1]*this[1]+this[2]*this[2];
}
Array.prototype.v4epsilon = function(){ return Math.abs(this.v4mag()) < V4_EPSILON; }
Array.prototype.v4unit = function(){
	if (this.v4epsilon()) { return [0, 0, 0, 1]; }
	var m = 1/this.v4mag();
	this[0] *= m; this[1] *= m;
	this[2] *= m; this[3] = 1;
	//console.log(this);
	return this;
}

Array.prototype.v4dot = function(v){
	return this[0]*v[0]+this[1]*v[1]*this[2]*v[2];
}

Array.prototype.v4x = function(v){
	return [
		this[1]*v[2]-this[2]*v[1],
		this[2]*v[0]-this[0]*v[2],
		this[0]*v[1]-this[1]*v[0],
		1
	];
}

Array.prototype.v4projontoplane = function(n){
	this.v4sub(v4mul(v4dot(this, n), n));
	return this;
}

Array.prototype.v4projontovector = function(v){
	var newu = v4mul(v4dot(this, v)/v4mag2(v), v);
	this[0] = newu[0];
	this[1] = newu[1];
	this[2] = newu[2];
	this[3] = 1;
	return this;
}

