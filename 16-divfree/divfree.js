const canv = document.getElementById("world");
const gl = canv.getContext("webgl2");

if (!gl) {
	throw "error: webgl2 not supported.";
}

const ext = gl.getExtension("EXT_color_buffer_float");
if (!ext) {
	throw "error: rendering to float texture not supported.";
}

/* these are global because I'm a laze */
const M = 720;
const w = 256;

const v_quad = makeShader(gl, document.getElementById("v_quad").text, gl.VERTEX_SHADER);

const ParticleData = function (gl) {
	this.gl = gl;

	const f_step = makeShader(gl,
	document.getElementById("f_step").text, gl.FRAGMENT_SHADER);

	this.p_step = makeProgram(gl, v_quad, f_step);
	this.p_step_prev = gl.getUniformLocation(this.p_step, "prev");
	this.p_step_time = gl.getUniformLocation(this.p_step, "time");
	this.p_step_max_age= gl.getUniformLocation(this.p_step, "max_age");
	this.p_step_octave = gl.getUniformLocation(this.p_step, "octave");
	this.p_step_seed = gl.getUniformLocation(this.p_step, "seed");
	this.p_step_x = gl.getAttribLocation(this.p_step, "x");

	const x = new Float32Array([1, 1, 1, -1, -1, 1, -1, -1]);
	this.xbuf = makeBuffer(gl, x, gl.STATIC_DRAW);


	/* data textures and framebuffers */
	let N = w*w;
	const data = new Float32Array(w*w*4);
	for (let i = 0; i < w; ++i) {
	for (let j = 0; j < w; ++j) {
		data[4*(w*i+j)  ] = 2*Math.random()-1;
		data[4*(w*i+j)+1] = 2*Math.random()-1;
		data[4*(w*i+j)+2] = Math.random();
		data[4*(w*i+j)+3] = 1;
	}}

	this.texA = makeTexture(gl, 0, gl.RGBA32F, w, w, gl.RGBA, gl.FLOAT,
	null, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
	this.fbfA = makeFramebuffer(gl, this.texA, 0);

	this.texB = makeTexture(gl, 1, gl.RGBA32F, w, w, gl.RGBA, gl.FLOAT,
	data, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
	this.fbfB = makeFramebuffer(gl, this.texB, 1);
	this.toA = true;

	/* carry over frames */
	this.f_fade = makeShader(gl, document.getElementById("f_fade").text, gl.FRAGMENT_SHADER);
	this.p_fade = makeProgram(gl, v_quad, this.f_fade);
	this.p_fade_x = gl.getAttribLocation(this.p_fade, "x");
	this.p_fade_prev = gl.getUniformLocation(this.p_fade, "prev");

	const bgtx = new Uint8Array(M*M*4);
	for (let i = 0; i < M*M; ++i) {
		bgtx[i*4+0] = 0;
		bgtx[i*4+1]	= 0;
		bgtx[i*4+2]	= 0;
		bgtx[i*4+3]	= 255;
	}

	this.texP = makeTexture(gl, 2, gl.RGBA, M, M, gl.RGBA, gl.UNSIGNED_BYTE,
	null, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
	this.fbfP = makeFramebuffer(gl, this.texP, 2);

	this.texQ = makeTexture(gl, 3, gl.RGBA, M, M, gl.RGBA, gl.UNSIGNED_BYTE,
	bgtx, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
	this.fbfQ = makeFramebuffer(gl, this.texQ, 3);


	/* render particles */
	const v_img = makeShader(gl, document.getElementById("v_img").text, gl.VERTEX_SHADER);
	const f_img = makeShader(gl, document.getElementById("f_img").text, gl.FRAGMENT_SHADER);

	this.p_img = makeProgram(gl, v_img, f_img);
	this.p_img_ij = gl.getAttribLocation(this.p_img, "ij");
	this.p_img_dat = gl.getUniformLocation(this.p_img, "dat");

	const ij = new Float32Array(N*2);
	for (let i = 0; i < w; ++i) {
	for (let j = 0; j < w; ++j) {
		ij[2*(i*w+j)  ] = i;
		ij[2*(i*w+j)+1] = j;
	}}
	this.ijbuf = makeBuffer(gl, ij, gl.STATIC_DRAW);

	this.N = w*w;
	this.clock = 0.01;
}
ParticleData.prototype.setParameters = function (params) {
	if (params.max_age) {
	setUniform(gl, this.p_step, this.p_step_max_age, "1f", params.max_age);
	}

	if (params.octave) {
	setUniform(gl, this.p_step, this.p_step_octave, "1i", params.octave);
	}

	if (params.N) {
	this.N = Math.min(params.N, w*w);
	}
	if (params.clock) {
	this.clock = params.clock;
	}
}
ParticleData.prototype.integrate = function (t) {
	const gl = this.gl;
	const toA = this.toA;

	setUniform(gl, this.p_step, this.p_step_prev, "1i", toA ? 1 : 0);
	setUniform(gl, this.p_step, this.p_step_time, "1f", t);
	setBuffer(gl, this.p_step, this.p_step_x, this.xbuf, 2, gl.FLOAT);

	render(gl, this.p_step, toA ? this.fbfA : this.fbfB, gl.TRIANGLE_STRIP, 0, 4);
	//render(gl, this.p_step, null, gl.TRIANGLE_STRIP, 0, 4);

}
ParticleData.prototype.render = function () {
	const gl = this.gl;
	const toA = this.toA;

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clear(gl.COLOR_BUFFER_BIT);

	/* render a copy of the last frame */
	setUniform(gl, this.p_fade, this.p_fade_prev, "1i", toA ? 3 : 2);
	setBuffer(gl, this.p_fade, this.p_fade_x, this.xbuf, 2, gl.FLOAT);
	render(gl, this.p_fade, toA ? this.fbfP : this.fbfQ, gl.TRIANGLE_STRIP, 0, 4);
	render(gl, this.p_fade, null, gl.TRIANGLE_STRIP, 0, 4);

	/* render updated locations */
	setUniform(gl, this.p_img, this.p_img_dat, "1i", toA ? 1 : 0);
	setBuffer(gl, this.p_img, this.p_img_ij, this.ijbuf, 2, gl.FLOAT);
	render(gl, this.p_img, toA ? this.fbfP : this.fbfQ, gl.POINTS, 0, this.N);
	render(gl, this.p_img, null, gl.POINTS, 0, this.N);
}


ParticleData.prototype.timestep = function () {

	time += this.clock;

	window.requestAnimationFrame(this.timestep.bind(this));
	p.integrate(time);
	p.render();

	this.toA = !this.toA;
}


/* initialise stuff */
const p = new ParticleData(gl);
p.setParameters({
	max_age: 120,
	octave: 31,
	N: 128*128,
	clock: p.clock
});
let time = 0;
setUniform(gl, p.p_step, p.p_step_seed, "1f", Math.random());

let numkeysdown = [0, 0, 0, 0, 0];
function encode(arr) {
	let ret = 0;
	let p = 1;
	for (let i = 0; i < arr.length; ++i, p *= 2) {
		ret |= p*arr[i];
	}
	if (ret === 0) { ret = 31; }
	return ret;
}
function modulate(val, up, step, min, max, bottom) {
	if (up) {
		val = val*step;
		if (val < min) { val = min; }
		val = Math.min(val, max);
	} else {
		val = val/step;
		if (bottom !== undefined && val < min) { val = bottom; }
	}
	return val;
}
window.addEventListener('keydown', function (e) {
	let num = parseInt(e.key);
	if (0 < num && num < 6) {
		numkeysdown[num-1] = 1;
	}
	if (e.key === 'v') {
		p.clock = modulate(p.clock, true, 2, 0.0025, 0.08, 0.0025);
	} else if (e.key === 'c') {
		p.clock = modulate(p.clock, false, 2, 0.0025, 0.08, 0.0025);
	}
	
	if (e.key === 'f') {
		p.N = modulate(Math.sqrt(p.N), true, 2, 16, 256, 16);
		p.N *= p.N;
	} else if (e.key === 'd') {
		p.N = modulate(Math.sqrt(p.N), false, 2, 16, 256, 16);
		p.N *= p.N;
	}
	p.setParameters({
		octave: encode(numkeysdown),
		clock: p.clock,
		N: p.N
	});
});
window.addEventListener('keyup', function (e) {
	let num = parseInt(e.key);
	if (0 < num && num < 6) {
		numkeysdown[num-1] = 0;
		p.setParameters({octave: encode(numkeysdown)});
	}
});

window.requestAnimationFrame(p.timestep.bind(p));
