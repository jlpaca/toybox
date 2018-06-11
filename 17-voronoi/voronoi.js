const canv = document.getElementById("world");
const gl = canv.getContext("webgl2");
if (!gl) { throw "error: webgl2 not supported."; }
gl.clearColor(0, 0, 0, 1);

const ext = gl.getExtension("EXT_color_buffer_float");
if (!ext) {	throw "error: rendering to float texture not supported."; }

/* shared quad shader & buffer data */
const v_quad = makeShader(gl, document.getElementById("v_quad").text, gl.VERTEX_SHADER);

const x = new Float32Array([ 1, 1, 1, -1, -1, 1, -1, -1]);
const b_x = makeBuffer(gl, x, gl.STATIC_DRAW);

const W = 720;
const N = 240;
let n = 36;

const Voronoi = function (gl) {
	this.gl = gl;
	
	this.f_step = makeShader(gl,
	document.getElementById("f_step").text, gl.FRAGMENT_SHADER);

	this.v_seed = makeShader(gl,
	document.getElementById("v_seed").text, gl.VERTEX_SHADER);
	this.f_seed = makeShader(gl,
	document.getElementById("f_seed").text, gl.FRAGMENT_SHADER);

	this.p_step = makeProgram(gl, v_quad, this.f_step);
	this.p_step_x = gl.getAttribLocation(this.p_step, "x");
	this.p_step_prev = gl.getUniformLocation(this.p_step, "prev");
	this.p_step_stepsize = gl.getUniformLocation(this.p_step, "stepsize");

	this.p_seed = makeProgram(gl, this.v_seed, this.f_seed);
	this.p_seed_i = gl.getAttribLocation(this.p_seed, "i");
	this.p_seed_site = gl.getUniformLocation(this.p_seed, "site");

	const index = new Float32Array(N);
	for (let i = 0; i < N; ++i) {
		index[i] = i;
	}
	this.i_buf = makeBuffer(gl, index, gl.STATIC_DRAW);

	const site = new Float32Array(N*4);
	for (let i = 0; i < N; ++i) {
		site[4*i+0] = Math.random();
		site[4*i+1] = Math.random();
		site[4*i+2] = 0;
		site[4*i+3] = 0;
	}
	this.texS = makeTexture(gl, 0, gl.RGBA32F, N, 1, gl.RGBA, gl.FLOAT,
	site, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
	this.fbfS = makeFramebuffer(gl, this.texS, 0);

	/* framebuffers for ping-pong-ing */
	this.texA = makeTexture(gl, 1, gl.RGBA32F, W, W, gl.RGBA, gl.FLOAT,
	null, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
	this.fbfA = makeFramebuffer(gl, this.texA, 1);

	this.texB = makeTexture(gl, 2, gl.RGBA32F, W, W, gl.RGBA, gl.FLOAT,
	null, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
	this.fbfB = makeFramebuffer(gl, this.texB, 2);

	this.toA = true;
}
Voronoi.prototype.seed = function () {
	const gl = this.gl;

	setBuffer(gl, this.p_seed, this.p_seed_i, this.i_buf, 1, gl.FLOAT);
	setUniform(gl, this.p_seed, this.p_seed_site, "1i", 0);

	render(gl, this.p_seed, this.fbfB, gl.POINTS, 0, n, true);
	render(gl, this.p_seed, null, gl.POINTS, 0, n, true);
}
Voronoi.prototype.pingpong = function () {
	const gl = this.gl;
	setBuffer(gl, this.p_step, this.p_step_x, b_x, 2, gl.FLOAT);

	let stepsize = 720;
	const iter = Math.log2(stepsize)+2;
	gl.useProgram(this.p_step);

	for (let i = 0; i < iter; ++i) {
		setUniform(gl, null, this.p_step_prev, "1i", this.toA ? 2 : 1);
		setUniform(gl, null, this.p_step_stepsize, "1f", stepsize);
		render(gl, null, this.toA ? this.fbfA : this.fbfB, gl.TRIANGLE_STRIP, 0, 4);

		this.toA = ! this.toA;
		stepsize /= 2;
	}
	render(gl, this.p_step, null, gl.TRIANGLE_STRIP, 0, 4);

}

const Lloyd = function (gl, vor) {
	this.gl = gl;

	this.f_1= makeShader(gl,
	document.getElementById("f_1").text, gl.FRAGMENT_SHADER);

	this.f_2= makeShader(gl,
	document.getElementById("f_2").text, gl.FRAGMENT_SHADER);

	this.p_1 = makeProgram(gl, v_quad, this.f_1);
	this.p_1_x = gl.getAttribLocation(this.p_1, "x");
	this.p_1_src = gl.getUniformLocation(this.p_1, "src");
	this.p_1_cursor = gl.getUniformLocation(this.p_1, "cursor");
	this.p_1_remove = gl.getUniformLocation(this.p_1, "remove");
	this.p_1_time = gl.getUniformLocation(this.p_1, "time");
	setUniform(gl, this.p_1, this.p_1_src, "1i", vor);

	this.p_2 = makeProgram(gl, v_quad, this.f_2);
	this.p_2_x = gl.getAttribLocation(this.p_2, "x");
	this.p_2_src = gl.getUniformLocation(this.p_2, "src");
	setUniform(gl, this.p_2, this.p_2_src, "1i", 3);

	this.p_2_n = gl.getUniformLocation(this.p_2, "n");
	this.p_2_cursor = gl.getUniformLocation(this.p_2, "cursor");

	this.texC = makeTexture(gl, 3, gl.RGBA32F, N, W, gl.RGBA, gl.FLOAT,
	null, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
	this.fbfC = makeFramebuffer(gl, this.texC, 3);
}
Lloyd.prototype.calculate = function (targ, ni, cur, t) {
	const gl = this.gl;

	setBuffer(gl, this.p_1, this.p_1_x, b_x, 2, gl.FLOAT);
	setUniform(gl, this.p_1, this.p_1_cursor, "2f", cursor); 
	setUniform(gl, this.p_1, this.p_1_remove, "1i", ni < 0 ? 1 : 0); 
	setUniform(gl, this.p_1, this.p_1_time, "1f", t);
	render(gl, null, this.fbfC, gl.TRIANGLE_STRIP, 0, 4);

	setBuffer(gl, this.p_2, this.p_2_x, b_x, 2, gl.FLOAT);
	setUniform(gl, this.p_2, this.p_2_n, "1i", Math.abs(ni)); 
	setUniform(gl, this.p_2, this.p_2_cursor, "2f", cur);
	render(gl, null, targ, gl.TRIANGLE_STRIP, 0, 4);
}

const v = new Voronoi(gl);
const l = new Lloyd(gl, 2);

let generate = false;
let remove = false

let cursor = [0, 0];
function updateCursorLocation (e) {
	const rect = e.target.getBoundingClientRect();
	cursor[0] = (e.clientX - rect.left)/rect.width;
	cursor[1] = 1-(e.clientY - rect.top)/rect.height;
}
canv.addEventListener('mousedown', function (e) {
	if (e.button == 0) {
		remove = true;
	} else {
		generate = true;
	}
	updateCursorLocation(e);
});
canv.addEventListener('mousemove', function (e) {
	updateCursorLocation(e);
});
canv.addEventListener('mouseup', function (e) {
	generate = false;
	remove = false;
});
canv.addEventListener('mouseleave', function (e) {
	generate = false;
	remove = false;
});

let relax = true;
window.addEventListener('keydown', function (e) {
	if (e.key === 'g') {
		relax = !relax;
	}
});

let time = 0;
function timestep () {
	window.setTimeout(timestep, 90);

	v.seed();
	v.pingpong();
	l.calculate(v.fbfS,
		generate ? n : (remove & n > 1) ? -n : N,
		cursor,
		relax ? 0 : time);
	if (generate) { n = Math.min(n+1, N); }
	if (remove) { n = Math.max(n-1, 1); }

	time += 0.01;
}
timestep();
