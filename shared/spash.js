var Spash = function(L, w){
	this.L = L;	// world size
	this.w = w;	// bucket size
	this.N = Math.ceil(L/w);

	this.table = [];
}
Spash.prototype = {
	hash: function(x, y){
		return this.N*
		Math.max(Math.min(this.N, Math.floor(x/this.w)), 0)+
		Math.max(Math.min(this.N, Math.floor(y/this.w)), 0);
	},
	insert:	function(x, y, i){
		var t = this.hash(x, y);
		if (!this.table[t]){ this.table[t] = []; }
		this.table[t].push(i);
	},
	lookup: function(x, y, i){
		var neighbour = {};
		var di = 0; var dj = 0;
		for (var di = -1; di < 2; di += 1) {
		for (var dj = -1; dj < 2; dj += 1) {
			var t =  this.hash(x+di*this.w, y+dj*this.w);
			if (this.table[t]) {
			for (var k = 0; k < this.table[t].length; ++k){
				neighbour[this.table[t][k]] = true;
			}
			}
		}}
		return neighbour;
	},
	empty: function(){
		this.table = [];
	}
}

