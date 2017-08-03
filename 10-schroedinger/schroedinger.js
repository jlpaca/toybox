var Schroedinger = function(){
	this.x_max = 4;	// integration range -x_max to x_max
	this.dx = 0.01;// space discretisation
	this.N = 2*this.x_max/this.dx;

	// potential function
	this.V = function(x){
		return 3*x*x;
	};
	this.asymptotic = function(E, x){
		return Math.exp(-Math.sqrt(this.f(E, x))*Math.abs(x));
	}

	this.E_n = [];	// list of energy eigenvalues
	this.phi_n = [];	// list of eigenstates


};
Schroedinger.prototype = {
f: function(E, x) {
	return 2*(this.V(x)-E);
},

shoot: function(E){ // returns phi at the other end of the range

	var x = -this.x_max;

	var f, f_prev, f_next;

	var phi, phi_prev, phi_next;

	var b = this.dx*this.dx/12;

	var intg = 1;

	x = -this.x_max;
	f = this.f(E, x);
	f_prev = this.f(E, x-this.dx);

	phi = this.asymptotic(E, -this.x_max);
	phi_prev = this.asymptotic(E, -this.x_max-this.dx);
	intg = 0;

	for (var i = 0; i < this.N; ++i) {

		f_next = this.f(E, x+this.dx);

		//phi_next = 2*phi - phi_prev + this.dx*this.dx*f*phi; // verlet
		phi_next = (2*phi*(1+5*b*f) - phi_prev*(1-b*f_prev))/(1-b*f_next);

		phi_prev = phi;
		phi = phi_next;

		f_prev = f;
		f = f_next;

		x += this.dx;

		intg += 0.5*this.dx*(phi*phi + phi_prev*phi_prev);
	}
	phi /= Math.sqrt(intg);

	return phi;
},

integrate: function(E){ // returns an array


	var x = -this.x_max;

	var f = this.f(E, x);
	var f_prev = this.f(E, x-this.dx);
	var f_next;

	var phi = [];
	phi[0] = this.asymptotic(E, -this.x_max);
	phi[-1] = this.asymptotic(E, -this.x_max-this.dx);

	var intg = 0;

	var b = this.dx*this.dx/12;

	for (var i = 0; i < this.N; ++i) {

		f_next = this.f(E, x+this.dx);

		//phi[i+1] = 2*phi[i] - phi[i-1] + this.dx*this.dx*f*phi[i];
		phi[i+1] = (2*phi[i]*(1+5*b*f) - phi[i-1]*(1-b*f_prev))/(1-b*f_next);

		f_prev = f;
		f = f_next;

		x += this.dx;
		intg += 0.5*this.dx*(phi[i+1]*phi[i+1]+phi[i]*phi[i]);
	}
	delete phi[-1];

	intg = Math.sqrt(intg);
	for (var i = 0; i < this.N+1; ++i) { phi[i] /= intg; }

	return phi;
},

eigensolve: function(N){
	console.log('eigensolve');

	// returns [ E1, E2 ] bracketing energies
	var eigenbracket = function(E_min, E_max, dE){
		var phi_target;
		
		var E1 = E_min;
		var E2;
	
		var phi1 = this.shoot(E1);
		var phi2;

		var res = undefined;
	
		// first find bracketing energies
		while ((E2 = E1 + dE) <= E_max) {
	
			var phi2 = this.shoot(E2);
			phi_target = this.asymptotic(E2, -this.x_max);

			if ((phi1-phi_target)*(phi2-phi_target) < 0) {
				res = [ E1, E2 ];
				break;
			}
	
			phi1 = phi2;
			E1 = E2;
		}

		return res;
	}.bind(this);
	
	// returns eigenstate energy s.t. boundary condition is
	// satisfied to within epsilon
	var eigenbisect = function(E_min, E_max, epsilon){

		var E_mid = (E_min + E_max)/2;
		var phi_min = this.shoot(E_min);
		var phi_mid = this.shoot(E_mid);
		var phi_max = this.shoot(E_max);

		var iter = 0;
		var max_iter = 60;

		var phi_target = this.asymptotic(E_mid, -this.x_max);

		while (Math.abs(phi_mid - phi_target) > epsilon &&
		iter < max_iter) {

			phi_target = this.asymptotic(E_mid, -this.x_max);

			if ((phi_mid-phi_target)*(phi_max-phi_target) < 0) {
				E_min = E_mid;
				phi_min = phi_mid;
			} else {
				E_max = E_mid;
				phi_max = phi_mid;
			}

			E_mid = (E_min + E_max)/2;
			phi_mid = this.shoot(E_mid);

			++iter;
		}
		if (Math.abs(phi_mid - phi_target) > epsilon) {
			console.log('! bisection failed to converge (' +
			(phi_mid - phi_target) + ')');
		}

		return E_mid;
	}.bind(this);


	this.E_n = [];
	var E_start = 0;
	var E_end = Infinity; // loop runs indefinitteelllyyy

	var phi_targ;

	for (var i = 0; i < N; ++i) {
		var bracket = eigenbracket(E_start, E_end, 0.01);
		if (!bracket) {
			console.log('failed');
			return false;
		}

		var Ei = eigenbisect(bracket[0], bracket[1], 1e-10);
		console.log('E_' + i + ' = ' + Ei);

		// add the found eigenfunction & energy to list
		this.E_n[i] = Ei;
		this.phi_n[i] = this.integrate(Ei);


		E_start = bracket[1];
	}
	
}

};

// draws f, an array of values, on ctx
function graph(ctx, f, yscale, clear, style){
	if (clear) {
		ctx.clearRect(0, 0,
		ctx.canvas.width, ctx.canvas.height);
	}
	if (style) {
		ctx.strokeStyle = style;
	}

	var n = f.length-1;

	var w = ctx.canvas.width;
	var h = ctx.canvas.height;

	var wprop = 1.0;
	var hprop = 1.0;

	var dx = w*wprop/n;
	var dy = h*hprop/2/yscale;

	ctx.beginPath();
	ctx.moveTo(0, h/2);
	for (var i = 0; i < f.length; ++i) {
		ctx.lineTo(dx*i, -f[i]*dy+h/2);
	}
	ctx.stroke();

}

// dot product for orthonormality checks.
function dot(f1, f2, dx){
	var intg = 0;
	var L = Math.max(f1.length, f2.length);
	for (var i = 0; i < f1.length-1; ++i) {
		intg += 0.5*dx*(f1[i]*f2[i]+f1[i+1]*f2[i+1])
	}
	return intg;
}

var Wave = function(sch, psi){
	this.sch = sch;

	this.components = []; // this.sch.E_n.length;

	this.from(psi);
};
Wave.prototype = {
	from: function(f){
		this.components = this.decompose(this.generate(f));
		this.evolve(0);
	},
	generate: function(f){
		// returns an array representing a normalised
		// wave function

		var psi = []; var intg = 0;
		var x = -this.sch.x_max;

		psi[0] = f(x);
		for (var i = 0; i < this.sch.N; ++i) {
			x += this.sch.dx;

			psi[i+1] = f(x);

			intg += 0.5*this.sch.dx*
				(psi[i]*psi[i]+	psi[i+1]*psi[i+1]);
		}

		// normalise
		intg = Math.sqrt(intg);
		for (var i = 0; i < this.sch.N+1; ++i) {
			psi[i] /= intg;
		}
		return psi;
	},
	decompose: function(val){
		// returns a decomposition of f as
		// eigenvalues of associated schroedinger eq.

		var components = [];
		for (var i = 0; i < this.sch.phi_n.length; ++i) {
			components[i] = dot(val,
			this.sch.phi_n[i], this.sch.dx);
		}
		return components;
	},
	evolve: function(comp, t){

		var Re = [];
		var Im = [];
		var prob=  [];
		for (var j = 0; j < this.sch.N+1; ++j) {
		Re[j] = Im[j] =  0;

		for (var i = 0; i < this.sch.phi_n.length; ++i) {
			Re[j] += 
			Math.cos(this.sch.E_n[i]*t)*
			this.sch.phi_n[i][j]*comp[i];

			Im[j] += 
			Math.sin(this.sch.E_n[i]*t)*
			this.sch.phi_n[i][j]*comp[i];

			prob[j] = Im[j]*Im[j] + Re[j]*Re[j];
		}}

		return { Re: Re, Im: Im, prob: prob };
	}
};


/* initialise graphics */
var canv = document.getElementById('canv');
var ctx = canv.getContext('2d');
ctx.lineWidth = 8;

/* solve eigenvalue problem */
var sch = new Schroedinger();

var N = 16; 
sch.eigensolve(N);

/* check for orthogonality */
/*
for (var i = 0; i < sch.phi_n.length; ++i) {
for (var j = i; j < sch.phi_n.length; ++j) {
console.log('phi_' + i + '*phi_' + j + ': ' + 
dot(sch.phi_n[i], sch.phi_n[j], sch.dx).toFixed(8));
}}
*/

/* express initial conditions */
var wave = new Wave(sch, function(x){
	x = 1.8*(x-1);
	return 3*Math.exp(-x*x);
});

/* graph eigenvalues */
//for (var i = 0; i < N; ++i) { graph(ctx, sch.phi_n[i], 1.5); }

function start(){
	
	var t = 0;
	var dt = 0.01;
	var state = [];
	var num = 0;
	var prob = false;
	for (var i = 0; i < sch.phi_n.length; ++i) {
		state[i] = 0;
	}

	var textdivs = document.getElementsByClassName('textdiv');

	/* handlers */
	window.addEventListener('keydown', function(e){
		var n = parseInt(e.key);
		if (0 <= n && n <= 9 && !state[n]) {
			e.preventDefault();

			state[e.key] = 1;
			++num;
			var prop = 1/Math.sqrt(num);
			for (var i = 0; i < state.length; ++i) {
				if (state[i]) { state[i] = prop; }
			}
		}
		if (e.keyCode == 32) {
			e.preventDefault();
			for (var i = 0; i < textdivs.length; ++i) {
				textdivs[i].classList.add('gray');
			}
			prob = true;
		}
	});
	
	window.addEventListener('keyup', function(e){
		var n = parseInt(e.key);
		if (0 <= n && n <= 9 && state[n]) {
			e.preventDefault();

			state[e.key] = 0;
			--num;

			var prop = 1/Math.sqrt(num);
			for (var i = 0; i < state.length; ++i) {
				if (state[i]) { state[i] = prop; }
			}
		}
		if (e.keyCode == 32) {
			e.preventDefault();
			for (var i = 0; i < textdivs.length; ++i) {
				textdivs[i].classList.remove('gray');
			}
			prob = false;
		}
	});

	/*
	for (var i = 0; i < 3; ++i) {
		graph(ctx, sch.phi_n[i], 1.5, 0, '#999');
	}
	*/


	window.setInterval(function(){
		var wav = num?wave.evolve(state, t):wave.evolve(wave.components, t);
		prob?
		graph(ctx, wav.prob, 1.5, 1, 'rgba(170, 170, 170, 0.5)'):
		(graph(ctx, wav.Re, 1.5, 1, 'rgba(0, 255, 255, 0.5)'),
		graph(ctx, wav.Im, 1.5, 0, 'rgba(255, 130, 255, 0.5)'));

		t += dt;
	
	}, 20);
	
}

start();
