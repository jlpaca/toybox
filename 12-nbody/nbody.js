function Simulation (canv, ctx)
{
	this.mass_list = [];

	this.canv = canv;
	this.ctx = ctx;

	this.steps_per_render = 1;

	this.W = canv.width;
	this.H = canv.height;
	this.L = Math.max(this.W, this.H);

	this.G = 0.4;
	this.dt = 0.08;
	this.theta2 = 0.4;
	this.merge_threshold = 4;

}

Simulation.prototype.recentre = function () {
	let sm = 0;
	let sx = 0;
	let sy = 0;
	let M = this.mass_list;
	for (let i = 0; i < M.length; ++i) {
		sm += M[i].m;
		sx += M[i].m * M[i].x;
		sy += M[i].m * M[i].y;
	}
	sx /= sm;
	sy /= sm;
	
	let dx = this.W/2 - sx;
	let dy = this.H/2 - sy;
	for (let i = 0; i < M.length; ++i) {
		M[i].x += dx;
		M[i].y += dy;
	}
}

Simulation.prototype.forces = function ()
{
	function force (mi, bhn, G)
	{
		rx = bhn.x - mi.x;
		ry = bhn.y - mi.y;

		scale = G*bhn.m/(Math.pow((rx*rx+ry*ry+0.1), 1.5) + 1e6);
		//scale = G*bhn.m/Math.max(Math.pow((rx*rx+ry*ry+0.1), 1.5), 1e6);

		mi.ax += scale*rx;
		mi.ay += scale*ry;
	}

	function bht_force (mi, bht, G, t2)
	{
		/* if far away, exert force as one body */

		if (bht.children === null) {
			/* exert force */
			if (bht.mass !== mi) {
				force(mi, bht, G);
			}
			return;
		}

		let dx = bht.x - mi.x;
		let dy = bht.y - mi.y;

		let d2 = dx*dx + dy*dy;
		let s2 = bht.L*bht.L;

		if (s2/d2 < t2) {
			force(mi, bht, G);
			return;
		}
		
		/* otherwise, recurse */
		for (let i = 0; i < 4; ++i) {
			bht_force(mi, bht.children[i], G, t2);
		}
	}

	/* construct tree */
	let M = this.mass_list;

	let bht = new BHtree(this.L, this.W/2, this.H/2);

	for (let i = 0, len = M.length; i < len; ++i) {
		if (M[i].x > 0 && M[i].y > 0 &&
		M[i].x < bht.X+bht.L/2 &&
		M[i].y < bht.Y+bht.L/2) {
			bht.insert(M[i]);
		}
	}

	/* calculate forces */
	for (let i = 0, len = M.length; i < len; ++i) {
		bht_force(M[i], bht, this.G, this.theta2);
	}
}

Simulation.prototype.integrate = function () {
	let M = this.mass_list;
	let dt = this.dt;

	/* symplectic euler */
	for (let i = 0, len = M.length; i < len; ++i) {
		let mi = M[i];
		mi.x += mi.u*dt;  mi.y += mi.v*dt;
		mi.u += mi.ax*dt; mi.v += mi.ay*dt;

		mi.ax = 0; mi.ay = 0;
	}
}

/* O(N^2) force for testing purposes */
/*
Simulation.prototype.forces_Nsq = function ()
{

	function force (mi, mj, G)
	{

		rx = mj.x - mi.x;
		ry = mj.y - mi.y;

		scale = G/(Math.pow(rx*rx + ry*ry, 1.5)+1e6);

		ax = scale*rx;
		ay = scale*ry;

		mi.ax += ax*mj.m; mi.ay += ay*mj.m;
		mj.ax -= ax*mi.m; mj.ay -= ay*mi.m;
	}

	let M = this.mass_list;
	let nmax = M.length;

	for (let i = 0; i < nmax; ++i) {
	for (let j = i + 1; j < nmax; ++j) {

		force(M[i], M[j], this.G);
	}}

}
*/

Simulation.prototype.collide = function ()
{
	function within (mi, mj, r)
	{
		if (mi.i === mj.i) {
			return false;
		}
		let dx = (mj.x-mi.x);
		let dy = (mj.y-mi.y);
		return dx*dx+dy*dy < r*r;
	}

	function absorb (mi, mj)
	{
		m = mi.m + mj.m;

		mi.u = (mi.u*mi.m + mj.u*mj.m)/m;
		mi.v = (mi.v*mi.m + mj.v*mj.m)/m;

		mi.x = (mi.x*mi.m + mj.x*mj.m)/m;
		mi.y = (mi.y*mi.m + mj.y*mj.m)/m;

		mi.m = m;
	}

	let M = this.mass_list;
	let sh = new SpatialHash();
	for (let i = 0; i < M.length; ++i) {
		sh.insert(M[i].x, M[i].y, M[i]);
	}

	let new_M = [];
	let collided = [];

	for (let i = 0, len = M.length; i < len; ++i) {		
		/* already merged with a previous mass,
		 * ignore */
		if (collided[M[i].i]) {
			continue;
		}

		let nhb = sh.query(M[i].x, M[i].y);
		for (let j = 0; j < nhb.length; ++j) {
			if (within(M[i], nhb[j], this.merge_threshold)) {
				absorb(M[i], nhb[j]);
				collided[nhb[j].i] = true;
			}
		}
		new_M.push(M[i]);
	}

	/* replace mass list */
	this.mass_list = new_M;
}

Simulation.prototype.render = function ()
{
	this.ctx.fillStyle = '#0a0600';
	this.ctx.fillRect(0, 0, this.W, this.H);

	let M = this.mass_list;
	/*
	for (let i = 0, n = M.length; i < n; ++i) {
		let c = 255*(M[i].m/1e2+0.6);
		this.ctx.fillStyle = `rgba(${c}, ${c}, ${c}, 1)`;
		this.ctx.fillRect(
			M[i].x - 1,
			M[i].y - 1,
			2,
			2
		);
	}
	*/
	let c = 0, r = 1;
	for (let i = 0, len = M.length; i < len; ++i) {
		c = Math.min(200, (M[i].m/100)*200);
		r = Math.cbrt(M[i].m)*0.2 + 1;

		this.ctx.fillStyle =
			"rgba(" + (255-c*0.1) 
			 + ", " + (c+90)
			 + ", " + (c+20)
			 + ", 1)";


		this.ctx.beginPath();
		this.ctx.arc(M[i].x, M[i].y, r, 0, 6.3);
		this.ctx.fill();
	}
}

Simulation.prototype.timestep = function ()
{
	this.render();

	for (let i = 0; i < this.steps_per_render; ++i) {
		//this.forces_Nsq();
		this.forces();
		this.integrate();
		this.collide();	
		this.recentre();
	}

	window.requestAnimationFrame(this.timestep.bind(this));
}

Simulation.prototype.addMass = (function () {
	let i = 0;

	return function (m, x, y, u, v)
	{
		this.mass_list.push(new Mass(i, m, x, y, u, v));
		++i;
	};
})();

Simulation.prototype.addRandomMass = function ()
{
	let thr = Math.random() * Math.PI * 2;
	let thv = Math.random() * Math.PI * 2;
	let r = Math.random()*260;
	let v = Math.random()*3;
	this.addMass(
		6,
		r * Math.cos(thr) + this.W/2,
		r * Math.sin(thr) + this.H/2,
		v * Math.cos(thv),
		v * Math.sin(thv)
	);
}
