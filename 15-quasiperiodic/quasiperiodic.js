let g = new GL(document.getElementById("world"));

g.makeShader("v", document.getElementById("vsh").text, g.gl.VERTEX_SHADER);
g.makeShader("f", document.getElementById("fsh").text, g.gl.FRAGMENT_SHADER);
g.makeProgram("p", g.sh.v, g.sh.f);

const x = new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]);

g.makeAttributeBuffer(g.prg.p, "x", 2, g.gl.FLOAT);
g.setAttributeBuffer(g.prg.p, "x", x);

g.makeUniform(g.prg.p, "t", "1f");
g.makeUniform(g.prg.p, "ampl", "1f");
g.makeUniform(g.prg.p, "lamb", "1f");
g.makeUniform(g.prg.p, "symm", "1f");
g.makeUniform(g.prg.p, "pair", "1f");

g.makeUniform(g.prg.p, "pa", "3fv");
g.makeUniform(g.prg.p, "pb", "3fv");
g.makeUniform(g.prg.p, "pc", "3fv");
g.makeUniform(g.prg.p, "pd", "3fv");

let ampl = 1.0;
let lamb = 0.05;
let omeg = 4.8;//0.4 * 2 * Math.PI;
let symm = 7.0;
let pair = 1.0;

let target_lamb = lamb;
let target_omeg = omeg;

let pv = [
new Float32Array([0.5, 0.5, 0.5]),
new Float32Array([0.5, 0.5, 0.5]),
new Float32Array([1.0, 1.0, 0.0]),
new Float32Array([0.5, 0.7, 0.18])];

function modifyWaves ()
{
	g.setUniform(g.prg.p, "ampl", ampl);
	g.setUniform(g.prg.p, "lamb", lamb);
	g.setUniform(g.prg.p, "symm", symm);
	g.setUniform(g.prg.p, "pair", symm % 2 ? pair : 1);
}

function modifyColours () {
	g.setUniform(g.prg.p, "pa", pv[0]);
	g.setUniform(g.prg.p, "pb", pv[1]);
	g.setUniform(g.prg.p, "pc", pv[2]);
	g.setUniform(g.prg.p, "pd", pv[3]);
}

function randomiseColours ()
{

	for (let j = 0; j < 3; ++j) {
		pv[0][j] = 0.2*Math.random()+0.5; }
	for (let j = 0; j < 3; ++j) {
		pv[1][j] = 0.8*Math.random(); }
	for (let j = 0; j < 3; ++j) {
		pv[2][j] = 1.5*Math.random(); }
	for (let j = 0; j < 3; ++j) {
		pv[3][j] = 0.6*Math.random(); }
}

window.addEventListener('keydown', function (e) {
	/* symmetry */
	if (parseInt(e.key) < 10) {
		symm = Number(e.key) + (Number(e.key < 4 ? 10: 0));
	}

	/* frequency & zoom */
	if (e.key === "ArrowDown") {	target_lamb /= 1.5; }
	else if (e.key === "ArrowUp") { target_lamb *= 1.5; }
	target_lamb = Math.max(2/90, Math.min(0.1125, target_lamb));

	if (e.key === "ArrowLeft") {
		target_omeg =
		target_omeg <= 1.3 ? 0 : target_omeg / 2;
	}
	else if (e.key === "ArrowRight") {
		target_omeg = 
		target_omeg < 1.1 ? 1.2 : target_omeg*2;

		target_omeg = Math.min(38.4, target_omeg);
	}

	if (e.key === " ") { pair = 3 - pair; }
	
});
function relax(a, b, x) {
	return a * (1-x) + b * x;
}

let t = 0; dt = 1e-2;
function timestep ()
{
	window.requestAnimationFrame(timestep);

	t += omeg/(symm % 2 ? pair : 1)*dt;

	omeg = relax(omeg, target_omeg, 0.5);
	lamb = relax(lamb, target_lamb, 0.9);

	/* send uniforms & render */
	g.setUniform(g.prg.p, "t", t);
	modifyWaves();
	g.render(g.prg.p, g.gl.TRIANGLE_STRIP);
}

/* send defaults */
modifyWaves();
modifyColours();

window.requestAnimationFrame(timestep);
