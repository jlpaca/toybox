var canvas = document.getElementById('world');
var gl = canvas.getContext('webgl');

gl.clearColor(0, 0, 0, 1);

function makeProgram(vertsource, fragsource) {
	var vertshader = makeShader(vertsource, gl.VERTEX_SHADER);
	var fragshader = makeShader(fragsource, gl.FRAGMENT_SHADER);

	var program = gl.createProgram();
	gl.attachShader(program, vertshader);
	gl.attachShader(program, fragshader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log(gl.getProgramInfoLog(program));
		return null;
	}

	return program;
}

function makeShader(source, type) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(shader));
		return null;
		gl.deleteShader(shader);
	}
	return shader;
}
var p = makeProgram(
	document.getElementById('vertsource').textContent,
	document.getElementById('fragsource').textContent);

var pinfo = {
	program: p,
	attribLocation: {
		vertq: gl.getAttribLocation(p, 'vertq'),
	},
	uniformLocation: {
		ballq: [],
		ballk: [],
		N: gl.getUniformLocation(p, 'N')
	}
};
gl.useProgram(pinfo.program);

var N = 12;
var N_MAX = 128;
var INTERACTIVE = true;
for (var i = 0; i < N_MAX; ++i) {
	pinfo.uniformLocation.ballq[i] =
	gl.getUniformLocation(pinfo.program, 'ballq[' + i + ']');
	
	pinfo.uniformLocation.ballk[i] =
	gl.getUniformLocation(pinfo.program, 'ballk[' + i + ']');
}


var vertq = [ 1, -1, 1, 1, -1, -1, -1, 1 ];
var vertqBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertqBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertq), gl.STATIC_DRAW);

gl.vertexAttribPointer(
	pinfo.attribLocation.vertq,
	2,
	gl.FLOAT,
	false,
	0,
	0);
gl.enableVertexAttribArray(pinfo.attribLocation.vertq);

var cursor = [ 0, 0, 0 ];

var ballv = []; var dt = .2;
var ballq = [];
var ballk = [];

for (var i = 0; i < N; ++i) {
	ballq[i] = [ Math.random() * 720, Math.random() * 720 ];
	ballv[i] = [ Math.random() * 4 - 2, Math.random() * 4 - 2 ];
	ballk[i] = Math.random()*1.2e+3;
}

function integrate() {
	for (var i = 0; i < N; ++i) {
		ballq[i][0] += ballv[i][0];
		ballq[i][1] += ballv[i][1];

		for (; ballq[i][0] >= 720; ballq[i][0] -= 720);
		for (; ballq[i][0] < 0; ballq[i][0] += 720);
		for (; ballq[i][1] >= 720; ballq[i][1] -= 720);
		for (; ballq[i][1] < 0; ballq[i][1] += 720);
	}
}

function distance2(p, q) {
	var px = p[0]; var py = p[1];
	var qx = q[0]; var qy = q[1];

	if (px - qx > 360.) { p.x -= 720.; }
	if (qx - px > 360.) { q.x -= 720.; }
	if (py - qy > 360.) { p.y -= 720.; }
	if (qy - py > 360.) { q.y -= 720.; }

	return (px-qx)*(px-qx)+(py-qy)*(py-qy);
}

function U(q) {
	var U = 0;
	var closest = 0;
	var tmp = Infinity;
	var d2;
	for (var i = 0; i < N; ++i) {
		d2 = distance2(q, ballq[i]);
		if (d2 < tmp) {
			tmp = d2;
			closest = i;
		}
		U += ballk[i]/d2;
	}
	return [U, closest];
}

function combine() {
	function merge(i, j) {
		// assumed i < j
		ballk[i] = ballk[i] + ballk[j];
		ballq[i][0] = (ballq[i][0]*ballk[i]+ballq[j][0]*ballk[j])/(ballk[i]+ballk[j]);
		ballq[i][1] = (ballq[i][1]*ballk[i]+ballq[j][1]*ballk[j])/(ballk[i]+ballk[j]);

		ballv[i][0] = (ballv[i][0]*ballk[i]+ballv[j][0]*ballk[j])/(ballk[i]+ballk[j]);
		ballv[i][1] = (ballv[i][1]*ballk[i]+ballv[j][1]*ballk[j])/(ballk[i]+ballk[j]);

		--N;
		ballq[j] = ballq[N];
		ballk[j] = ballk[N];
		ballv[j] = ballv[N];
	}
	function sub(u, v) {
		return [u[0]-v[0], u[1]-v[1]];
	}
	function dot(u, v) {
		return u[0]*v[0]+u[1]*v[1];
	}
	for (var i = 0; i < N; ++i) {
	for (var j = i+1; j < N; ++j) {

		//var threshold = ballk[i]*ballk[j]*1e-2;
		var threshold = 0.5*(ballk[i]+ballk[j]);
		if (distance2(ballq[i], ballq[j]) < threshold &&
		dot(
			sub(ballq[i], ballq[j]),
			sub(ballv[i], ballv[j])
		) < 0
		) {
			merge(i, j);
		}
	}}
}

function split(i) {
	if (N >= N_MAX || ballk[i] < 50) { return; }
	ballk[i] /= 2;

	var dv = [ ballv[i][1], -ballv[i][0] ];
	var vmag = Math.sqrt(dv[1]*dv[1]+dv[0]*dv[0])/2;
	dv[0] /= vmag; dv[1] /= vmag;
	

	ballk[N] = ballk[i];
	ballq[N] = [ ballq[i][0], ballq[i][1] ];
	ballv[N] = [ (ballv[i][0]-dv[0])*.9, (ballv[i][1]-dv[1])*.9 ];
	
	ballv[i] = [(ballv[i][0]+dv[0])*.9, (ballv[i][1]+dv[1])*.9];

	++N;
}

function updateUniforms() {
	for (var i = 0; i < N; ++i) {
		gl.uniform2f(
			pinfo.uniformLocation.ballq[i],
			ballq[i][0], ballq[i][1]);
		gl.uniform1f(
			pinfo.uniformLocation.ballk[i],
			ballk[i]);
		gl.uniform1i(
			pinfo.uniformLocation.N,
			N);
	}
}

function updateCursor(e) {
	cursor[0] = e.offsetX;
	cursor[1] = 720-e.offsetY;
	cursor[2] = U(cursor);
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function timestep() {

	if (INTERACTIVE) { combine(); }

	integrate();
	updateUniforms();

	render();

	window.requestAnimationFrame(timestep);
}

function keydownHandler(e) {
	console.log(e.keyCode);
	if (e.keyCode == 32) {
		INTERACTIVE = !INTERACTIVE;
	}
	if (e.keyCode == 83) {
		console.log('SPLIT');
		for (var i = 0; i < N; ++i) {
			split(i);
		}
	}
}

canvas.addEventListener('mousemove', updateCursor);
canvas.addEventListener('mousedown', function(e) {
	updateCursor(e);
	if (INTERACTIVE && (cursor[2][0] > 0.4)) {
		split(cursor[2][1]);
	}
});
window.addEventListener('keydown', keydownHandler);

timestep();
