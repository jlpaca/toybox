const Particle = function (params) {
	this.q = [ params.x, params.y, 0, 1 ];
	this.q_prev = this.q.v4clone();
	this.a = [ 0, 0, 0, 1 ];

	this.neighbours = [];
	this.order = 0;

	this.m = params.m;
}
Particle.prototype.diameter = 16;
Particle.prototype.margin = 2;
Particle.prototype.integrate = function (dt) {
	let old_q = this.q.v4clone();
	this.q.v4mul(2).v4sub(this.q_prev)
		.v4add(this.a.v4mul(dt*dt/2));
	
	/* damp */
	const damping = 0.01;
	this.q.v4mul(1-damping).v4add(v4mul(damping, old_q));
	this.q_prev = old_q;

	/* ad-hoc clamp */
	this.q[0] = Math.max(this.diameter/2,
		Math.min(this.q[0], 720-this.diameter/2));
	this.q[1] = Math.max(this.diameter/2,
		Math.min(this.q[1], 720-this.diameter/2));
}
Particle.prototype.initVisual = function (ref) {
	const div = document.createElement("div");
	div.classList.add("particle");
	div.style.width = (this.diameter - this.margin) + 'px';
	div.style.height = (this.diameter - this.margin) + 'px';
	//div.style.border = this.margin + 'px solid #fff';
		
	ref.appendChild(div);

	this.visual = div;
}
Particle.prototype.syncVisual = function () {
	const div = this.visual;
	if (!div) { return; }

	const c = 1;//Math.cos(this.theta);
	const s = 0;//Math.sin(this.theta);
	const w = this.diameter/2;

	div.style.transform = "matrix(" +
	c + "," + (-s) + "," +
	s + "," +   c  + "," +
	(this.q[0]-w) + "," + (this.q[1]-w) + ")";

	const t = Math.max(0, 1-this.order);

	div.style.backgroundColor = 'rgb(' +
	Math.max(0, Math.min(64 + 6*this.m + 10*t, 100)) + '%,' +
	Math.max(0, Math.min(64 + 6*this.m - 60*t, 100)) + '%,' +
	Math.max(0, Math.min(64 + 6*this.m - 80*t, 100)) + '%)';
}

const Lab = function (params) {
	this.phi = params.phi;
	this.H = [ 0,
		Math.sin(this.phi),
		Math.cos(this.phi),
		1].v4mul(4.5);
	this.T = params.T;
	this.particles = [];
	this.ref = params.ref;
	this.dt = 0.2;

	this.sh = new Spash(720, 32);
}
Lab.prototype.updateHash = function () {
	this.sh.empty();
	for (let i = 0; i < this.particles.length; ++i) {
		this.sh.insert(
			this.particles[i].q[0],
			this.particles[i].q[1],
			i);
	}

	for (let i = 0; i < this.particles.length; ++i) {
		this.particles[i].order = -Math.log2(this.T+1)/8;
	}
	const thres = 1.4;
	for (let i = 0; i < this.particles.length; ++i) {
		const pa = this.particles[i];
		pa.neighbours = this.sh.lookup(pa.q[0], pa.q[1]);

		for (let j in pa.neighbours) {
			const pb = this.particles[j];
			const d = v4sub(pb.q, pa.q).v4mag()/
				Particle.prototype.diameter;
			if (i < j && d < thres) {
				pa.order += thres-d;
				pb.order += thres-d;
			}			
		}
	}

	/* debug */
	minord = 100;
	maxord = 0;
	avgord = 0;
	for (let i = 0; i < this.particles.length; ++i) {
		maxord = Math.max(maxord, this.particles[i].order);
		minord = Math.min(minord, this.particles[i].order);
		avgord += this.particles[i].order;
	}
	console.log(maxord, minord, avgord/this.particles.length);
}
Lab.prototype.addParticle = function (params) {
	const p = new Particle(params);
	p.initVisual(this.ref);

	this.particles.push(p);
}
Lab.prototype.forces = function () {
	for (let i = 0; i < this.particles.length; ++i) {
		this.particles[i].a.v4set(0, 0, 0);
	}
	/* brownian */
	for (let i = 0; i < this.particles.length; ++i) {
		const th = Math.random()*Math.PI*2;
		this.particles[i].a =
			[ this.T*Math.cos(th), this.T*Math.sin(th), 0, 1];
	}
	/* dipole-dipole */
	function dforces (H, pa, pb) {
		const ma = v4mul(pa.m, H);
		const mb = v4mul(pb.m, H);
		const r = v4sub(pb.q, pa.q);
		const d = v4mag(r);
		if (d > 32) { return; }

		const c = 1e4;
		
		const F = v4mul(c/Math.pow(d, 5),
		v4mul(v4dot(ma, r), mb).v4add(
		v4mul(v4dot(mb, r), ma)).v4add(
		v4mul(v4dot(ma, mb), r)).v4sub(
		v4mul(
			5*v4dot(ma, r)*v4dot(mb, r)/d/d,
			r)));

		F[2] = 0;
		pa.a.v4sub(F);
		pb.a.v4add(F);

	}

	for (let i = 0; i < this.particles.length; ++i) {
		for (let j in this.particles[i].neighbours) {
			if (i < j) {
				dforces(
				this.H,
				this.particles[i],
				this.particles[j]);
			}
		}
	}

	/*
	for (let i = 0; i < this.particles.length; ++i) {
	for (let j = i+1; j < this.particles.length; ++j) {
		dforces(
			this.H,
			this.particles[i],
			this.particles[j]);
	}}
	*/
}
Lab.prototype.constraints = function () {
	function constrain (pa, pb) {
		const u = v4sub(pb.q, pa.q);
		const d = u.v4mag();
		const offset = (pa.diameter-d)/2;
		if (offset <= 0) { return; }

		pa.q.v4sub(v4mul(offset/d, u));
		pb.q.v4add(v4mul(offset/d, u));

	}

	for (let i = 0; i < this.particles.length; ++i) {
		for (let j in this.particles[i].neighbours) {
			if (i < j) {
				constrain(
				this.particles[i],
				this.particles[j]);
			}
		}
	}

	/*
	for (let i = 0; i < this.particles.length; ++i) {
	for (let j = i+1; j < this.particles.length; ++j) {
		constrain(
			this.particles[i],
			this.particles[j]);
	}}
	*/
}

Lab.prototype.integrate = function () {
	for (let i = 0; i < this.particles.length; ++i) {
		this.particles[i].integrate(this.dt);
	}
}
Lab.prototype.render = function () {
	for (let i = 0; i < this.particles.length; ++i) {
		this.particles[i].syncVisual();
	}
}
Lab.prototype.timestep = function () {
	window.requestAnimationFrame(this.timestep.bind(this));

	this.updateHash();
	this.forces();
	this.integrate();	
	this.constraints();
	this.constraints();
	this.render();
}



const l = new Lab({
	ref: document.getElementById("world"),
	phi: 0,
	T: 2
});

window.addEventListener('keydown', function (e) {
	/* control temperature */
	if (e.key === "ArrowUp") {
		l.T = l.T ? Math.min(32, l.T *= 2) : 1;
	}
	if (e.key === "ArrowDown") {
		l.T = Math.floor(l.T/2);
	}

	/* control magnetic field direction */
	const phi_inc = Math.PI/12;
	if (e.key === "ArrowLeft") {
		l.phi = Math.min(Math.PI/2, l.phi + phi_inc);
		l.H = [ 0, Math.sin(l.phi),	Math.cos(l.phi), 1].v4mul(4.5);
	}
	if (e.key === "ArrowRight") {
		l.phi = Math.max(0, l.phi - phi_inc);
		l.H = [ 0, Math.sin(l.phi),	Math.cos(l.phi), 1].v4mul(4.5);
	}
	console.log("T = " + l.T + "; H = " + l.H);
});

/* initial array of particles */
const N = 36;
const w = 720/N;
for (let i = 0; i < N; ++i) {
for (let j = 0; j < N; ++j) {
	l.addParticle({
		x: w*(i+0.5),
		y: w*(j+0.5),
		theta: 3.14*Math.random(),
		m: Math.random() > 0.5 ? 1 : -1
	});
}}
l.timestep();
