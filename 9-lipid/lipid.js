var pseudorandom = function(){
	var table = [];
	var current = 0;
	for (var i = 0; i < 3000; ++i) {
		table.push(Math.random());
	}

	return function(){
		current = (current+1)%table.length;
		return table[current];
	};
}();

var Particle = function(x, y, m){
	this.m = 1;
	this.q = new Vector2(x, y);
	this.prev_q = new Vector2(x, y);

	this.f = new Vector2(0, 0);
}
Particle.prototype = {

	integrate: function(dt, damping){

		var new_q = this.q.clone().mul(2).sub(this.prev_q).add(
			V2.mul(this.m*dt*dt, this.f));
		this.prev_q = this.q;

		this.q = new_q;
		this.q.sub(V2.sub(this.q, this.prev_q).mul(damping));
		
		this.f.set(0, 0);
	}
};


var Lipid = function(x, y, thet){
	this.head = new Particle(x, y, 1);
	this.tail = new Particle(
		this.head.q.x+this.l*Math.cos(thet),
		this.head.q.y+this.l*Math.sin(thet),
		1);
}
Lipid.prototype = {
	l: 7,
	r: 1,

	integrate: function(dt, L, damping){
		// move individual ends
		this.head.integrate(dt, damping);
		this.tail.integrate(dt, damping);

		// solve length constraint
		
		var d = V2.sub(this.head.q, this.tail.q);
		var p = (d.mag()-this.l)/2;
		d.unit();

		this.head.q.sub(V2.mul(p, d));
		this.tail.q.add(V2.mul(p, d));

		// wrap around
		while (this.head.q.x > L) {
			this.head.q.x -= L; this.head.prev_q.x -= L;
			this.tail.q.x -= L; this.tail.prev_q.x -= L;
		}
		while (this.head.q.y > L) {
			this.head.q.y -= L; this.head.prev_q.y -= L;
			this.tail.q.y -= L; this.tail.prev_q.y -= L;
		}
		while (this.head.q.x < 0) {
			this.head.q.x += L; this.head.prev_q.x += L;
			this.tail.q.x += L; this.tail.prev_q.x += L;
		}
		while (this.head.q.y < 0) {
			this.head.q.y += L; this.head.prev_q.y += L;
			this.tail.q.y += L; this.tail.prev_q.y += L;
		}
	},
	draw: function(ctx){
		ctx.beginPath();
		ctx.moveTo(this.head.q.x, this.head.q.y);
		ctx.arc(this.head.q.x, this.head.q.y,
		this.r, 0, 2*Math.PI);

		ctx.moveTo(this.head.q.x, this.head.q.y);
		ctx.lineTo(this.tail.q.x, this.tail.q.y);
		ctx.stroke();

	}
};


// a sigmoid function that takes goes from 0 to 1
function sgm(x){ return 0.5+2*x/Math.sqrt(1+16*x*x); }

function ramp(near, far, threshold, width, range){

	// interpolates between near and far values, making
	// jump at threshold with width being the distance
	// from threshold required to nearly reach target value.
	// beyond range, force is taken to be zero.
	return function(r){
		if (r > range) { return 0; }

		return near+sgm((r-threshold)/width)*(far-near)-
		sgm((r-range+width*2)/width)*far;
	};
}


function force_hh(r){
	return (ramp(-40,	-0.4,	10,	2.5,	70)(r) +
		ramp(10, 	0.02,	20,	5,	70)(r) +
		ramp(320,	0,	8,	4,	20)(r));
}
function force_tt(r){
	return (ramp(-40,	-0.4,	30,	10,	70)(r) +
		ramp(320,	0,	8,	4,	20)(r));
}
function force_ht(r){
	return (ramp(62,	0.4,	20,	5,	30)(r) +
		ramp(320,	0,	8,	4,	20)(r));
}
function force_ct(r){
	return (ramp(80, 0.4, 60, 5, 60)(r) + 
		ramp(320, 0, 12, 4, 20)(r));
}
function force_ch(r){
	return (ramp(120, 0.4, 60, 5, 60)(r) + 
		ramp(320, 0, 12, 4, 20)(r));
}
function force(a, b, forcefunc){
	var r = V2.sub(b.q, a.q);
	var m = forcefunc(r.mag());
	r.unit().mul(m);

	a.f.sub(r); b.f.add(r);
}
function repel(p, q, forcefunc){
	var r = V2.sub(q, p.q);
	var m = forcefunc(r.mag());
	r.unit().mul(m);

	p.f.sub(r);
}



var Pool = function(L, dt, damping, temp){
	this.lipids = [];
	this.max_lipids = 1600;

	this.L = L;
	this.dt = dt;

	this.spatialhash = new Spash(this.L, 90);
	this.useSpatialHash = true;

	this.damping = damping;
	this.temperature = temp;

	this.canv = document.getElementById('pool');
	this.canv.width = this.canv.height = this.L;
	this.ctx = this.canv.getContext('2d');

	this.ctx.strokeStyle = "#ffe0e0";
	this.ctx.fillStyle = "#ff5c5c";

	this.cursor = new Cursor(this.canv);

	window.addEventListener('keydown', function(e){
		if (e.key == 'r') { this.clear(); }
	}.bind(this));
}
Pool.prototype = {
	addLipid: function(x, y, thet){
		this.lipids.push(new Lipid(x, y, thet));
	},
	addRandomLipids: function(n) {
		for (var i = 0; i < n; ++i) {
			this.addLipid(
			pseudorandom()*this.L,
			pseudorandom()*this.L,
			pseudorandom()*2*Math.PI
			);
		}
	},
	integrate: function(){
		for (var i = 0; i < this.lipids.length; ++i) {
			this.lipids[i].integrate(
			this.dt, this.L, this.damping);
		}
	},
	forces: function(){
	
		// brownian
		for (var i = 0; i < this.lipids.length; ++i) {
			var b_mag = this.temperature;
			this.lipids[i].head.f.set(
				b_mag*2*pseudorandom()-b_mag,
				b_mag*2*pseudorandom()-b_mag);
			this.lipids[i].tail.f.set(
				b_mag*2*pseudorandom()-b_mag,
				b_mag*2*pseudorandom()-b_mag);
		}

		
		
		// N^2 thingy.
		if (this.useSpatialHash === false) {
			for (var i = 0; i < this.lipids.length; ++i) {
			for (var j = i+1; j < this.lipids.length; ++j) {
				force(this.lipids[i].tail, this.lipids[j].tail, force_tt);
				force(this.lipids[i].head, this.lipids[j].head, force_hh);

				force(this.lipids[i].head, this.lipids[j].tail, force_ht);
				force(this.lipids[j].head, this.lipids[i].tail, force_ht);
			}}

		} else {
		
			var sh = this.spatialhash;
			sh.empty();
			for (var i = 0; i < this.lipids.length; ++i) {
				var h = this.lipids[i].head;
				sh.insert(h.q.x, h.q.y, i);
			}
			for (var i = 0; i < this.lipids.length; ++i) {
				var h = this.lipids[i].head;
				var n = sh.lookup(h.q.x, h.q.y);
			for (var j = i+1; j < this.lipids.length; ++j) {
				if (n[j]) {
				force(this.lipids[i].tail, this.lipids[j].tail, force_tt);
				force(this.lipids[i].head, this.lipids[j].head, force_hh);

				force(this.lipids[i].head, this.lipids[j].tail, force_ht);
				force(this.lipids[j].head, this.lipids[i].tail, force_ht);
				}
			}}

			if (this.cursor.action === 0) {
				for (var i = 0; i < this.lipids.length; ++i){
				repel(this.lipids[i].head, this.cursor.q, force_ch);
				repel(this.lipids[i].tail, this.cursor.q, force_ct);
				}
			}
		}

	},
	render: function(){
		this.ctx.fillRect(0, 0, this.canv.width, this.canv.height);
		for (var i = 0; i < this.lipids.length; ++i) {
			this.lipids[i].draw(this.ctx);
		}
	},
	timestep: function(){

		// content changes
		if (this.cursor.action === 2 &&
		this.lipids.length < this.max_lipids){
			this.addLipid(
			this.cursor.q.x, this.cursor.q.y,
			pseudorandom()*2*Math.PI);
		}

		this.forces();
		this.integrate();
		this.render();

	},
	run: function(){
		this.timestep();
		window.requestAnimationFrame(this.run.bind(this));
	},

	clear: function(){
		var clearver = 0;

		return function(){
			clearver = (clearver+1)%2
			this.lipids = [];
			if (clearver) {
				this.addRandomLipids(400);
			}
		}
	}()
}

var pool = new Pool(720, 0.04, 0.12, 60);


// initial conditions: two circles, some other stuff
var n = 60;
var t = Math.PI*2/n;
for (var i = 0; i < n; ++i) {
	pool.addLipid(
	360+90*Math.cos(i*t),
	360+90*Math.sin(i*t), i*t);
}

n = 70
t = Math.PI*2/n;
for (var i = 0; i < n; ++i) {
	pool.addLipid(
	360+120*Math.cos(i*t),
	360+120*Math.sin(i*t), i*t+Math.PI);
}

n = 100;
for (var i = 0; i < n; ++i) {
	var t = pseudorandom()*2*Math.PI;
	pool.addLipid(
	360+Math.cos(t)*(0.8+pseudorandom())*200,
	360+Math.sin(t)*(0.8+pseudorandom())*200,
	pseudorandom()*2*Math.PI);
}

pool.run();

