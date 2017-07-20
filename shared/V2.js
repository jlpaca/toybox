// SIMPLE 2-VECTOR LIBRARY
var Vector2 = function(x, y){ this.x = x; this.y = y; }
Vector2.prototype = {
	x: 0, y: 0,
	set: function(x, y) { this.x = x, this.y = y; },
	add: function(v, w) {
		if (v.x !== undefined) { this.x += v.x; this.y += v.y; }
		else { this.x += v, this.y += w; }
		return this;
	},
	sub: function(v, w) {
		if (v.x !== undefined) { this.x -= v.x; this.y -= v.y; }
		else { this.x -= v, this.y -= w; }
		return this;
	},
	mul: function(a) { this.x *= a; this.y *= a; return this; },
	div: function(a) { this.x /= a; this.y /= a; return this; },
	mag: function() { return Math.sqrt(this.x*this.x+this.y*this.y); },
	unit: function() {
		return this.mag()<V2.epsilon?
		this.set(0, 0):
		this.div(this.mag());
	},
	clone: function() { return new Vector2(this.x, this.y); },

	clip: function(m) {
		if (this.mag() < m) { return this; }
		return this.unit().mul(m);
	}
};
var V2 = {
	epsilon: 1e-10,

	add: function(u, v) { return new Vector2(u.x+v.x, u.y+v.y); },
	sub: function(u, v) { return new Vector2(u.x-v.x, u.y-v.y); },
	mul: function(a, u) { return new Vector2(a*u.x, a*u.y); },
	div: function(a, u) { return new Vector2(u.x/a, u.y/a); },
	unit: function(u) { return u.clone().unit(); }
};

