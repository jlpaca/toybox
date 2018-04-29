function makeShader (gl, type, src)
{
	const sh = gl.createShader(type);
	gl.shaderSource(sh, src);
	gl.compileShader(sh);
	if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		return sh;
	}

	console.log(gl.getShaderInfoLog(sh));
	gl.deleteShader(sh);
}

function makeProgram (gl, vsh, fsh)
{
	const prg = gl.createProgram();
	gl.attachShader(prg, vsh);
	gl.attachShader(prg, fsh);
	gl.linkProgram(prg);
	if (gl.getProgramParameter(prg, gl.LINK_STATUS)) {
		return prg;
	}

	console.log(gl.getProgramInfoLog(prg));
	gl.deleteProgram(prg)
}

function init ()
{
	const canvas = document.getElementById("world");
	const gl = canvas.getContext("webgl");

	const vsh = makeShader(
		gl,	gl.VERTEX_SHADER,
		document.getElementById("vsh").text);

	const fshJ = makeShader(
		gl, gl.FRAGMENT_SHADER,
		document.getElementById("fsh-J").text);

	const fshM = makeShader(
		gl, gl.FRAGMENT_SHADER,
		document.getElementById("fsh-M").text);

	const prgJ = makeProgram(gl, vsh, fshJ);
	const prgM = makeProgram(gl, vsh, fshM);

	const x_data = new Float32Array([
		 1,  1,
		 1, -1,
		-1,  1,
		-1, -1]);

	const x_buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, x_buf);
	gl.bufferData(gl.ARRAY_BUFFER, x_data, gl.STATIC_DRAW);

	/* for Julia */
	gl.useProgram(prgJ);
	const x_locJ = gl.getAttribLocation(prgJ, "x");
	gl.enableVertexAttribArray(x_locJ);
	gl.vertexAttribPointer(x_locJ, 2, gl.FLOAT, false, 0, 0);

	const c_locJ = gl.getUniformLocation(prgJ, "c");
	gl.uniform2f(c_locJ, -0.21, -0.66);
	//gl.uniform2f(c_locJ, -0.214, -0.67);

	/* for Mandelbrot */
	gl.useProgram(prgM);
	const x_locM = gl.getAttribLocation(prgM, "x");
	gl.enableVertexAttribArray(x_locM);
	gl.vertexAttribPointer(x_locM, 2, gl.FLOAT, false, 0, 0);

	gl.useProgram(prgJ);

	return {
		gl: gl,
		prg: {
			J: prgJ,
			M: prgM
		},
		a_loc: {
			J: { x: x_locJ },
			M: { x: x_locM }
		},
		u_loc: {
			J: { c: c_locJ },
			M: {},
		},
		buf: {
			x: x_buf
		},
	};

}

function render (state)
{
	state.gl.drawArrays(state.gl.TRIANGLE_STRIP, 0, 4);
}

let active = 1;
const state = init();
render(state);

/* parameters for Julia renderer */
let cx = 0; let cy = 0;
let offsetx = 0.8; let offsety = 0;
const scale = 2.0;


const deactivate = function () {
	active = 0;
	state.gl.useProgram(state.prg.M);
	render(state);


	/* change style, last minute hacky thing */
	document.body.className = "shifted";

	console.log(cx + ' + ' + cy + 'i');
}

const activate = function () {
	active = 1;
	state.gl.useProgram(state.prg.J);
	render(state);

	document.body.className = "";
}

const canv = document.getElementById('world');
window.addEventListener('mouseup', activate);
window.addEventListener('mousedown', deactivate);

window.addEventListener('mousemove', function (e) {
	if (!active) { return; }

	const rect = canv.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	cx = 2*x/canv.width-1;
	cx = cx*scale-offsetx;

	cy = -2*y/canv.width+1;
	cy = cy*scale-offsety;

	state.gl.useProgram(state.prg.J);
	state.gl.uniform2f(state.u_loc.J.c, cx, cy);
	render(state);
});
