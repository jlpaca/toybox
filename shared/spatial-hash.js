function SpatialHash (cell_size, table_size, margin)
{
	this.k = cell_size | 120;
	this.margin = margin | 4;

	this.m = table_size | 8191;
	this.table = [];
}

SpatialHash.prototype.hash = function (x, y)
{
	x = x/this.k | 0;
	y = y/this.k | 0;

	let h = 5381;
	h = (h << 5) + h + x;
	h = (h << 5) + h + y;
	return h % this.m;
}

SpatialHash.prototype.insert = function (x, y, obj)
{
	let h = this.hash(x, y);
	if (this.table[h] === undefined) {
		this.table[h] = new Set();
	}
	this.table[h].add(obj);
}
SpatialHash.prototype.query = function (x, y) {
	let ret = new Set();

	const m = this.margin;
	let dx = [ 0, 0,  0, m, m,  m, -m, -m, -m ];
	let dy = [ 0, m, -m, 0, m, -m,  0,  m, -m ];
	for (let i = 0; i < 9; ++i) {
		let h = this.hash(x+dx[i], y+dy[i]);
		let r = this.table[h];

		if (r !== undefined) {
			r.forEach(function(e) {
				ret.add(e)
			});
		}
	}

	return Array.from(ret);
}
