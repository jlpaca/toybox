var g = new GL(document.getElementById("world"));
g.makeShader("v", document.getElementById("vsh").text, g.gl.VERTEX_SHADER);
g.makeShader("fsim", document.getElementById("fsh-sim").text, g.gl.FRAGMENT_SHADER);
g.makeShader("fimg", document.getElementById("fsh-img").text, g.gl.FRAGMENT_SHADER);

g.makeProgram("psim", g.sh.v, g.sh.fsim);
g.makeProgram("pimg", g.sh.v, g.sh.fimg);


/* set up vertex buffer */
const vert_x = new Float32Array([ 1, 1, -1, 1, 1, -1, -1, -1 ]);

g.makeAttributeBuffer(g.prg.psim, "vert_x", 2, g.gl.FLOAT);
g.setAttributeBuffer(g.prg.psim, "vert_x", vert_x);

g.makeAttributeBuffer(g.prg.pimg, "vert_x", 2, g.gl.FLOAT);
g.setAttributeBuffer(g.prg.pimg, "vert_x", vert_x);

/* set up textures */
const w_width = 512;
const tex_A = new Float32Array(w_width*w_width*4);
for (let i = 0; i < w_width*w_width*4; ++i) { tex_A[i] = 0;	}

function set_f_eq(arr, i, j, rho) {
	let w = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36];

	let f = [];
	for (let c = 0; c < 9; ++c) {
		f[c] = rho * w[c];
	}

	for (let c = 0; c < 9; ++c) {
		let x = 2*i + (c%3 == 2 ? 1 : 0);
		let y = 2*j + (c%3 == 1 ? 1 : 0);
		let cl = Math.floor(c/3);
		arr[(x+w_width*y)*4+cl] = f[c];
	}
}

for (let i = 0; i < w_width/2; ++i) {
for (let j = 0; j < w_width/2; ++j) {
	set_f_eq(tex_A, i, j, 1.0);
}}

g.makeTexture("tex_A");
g.setTexture("tex_A", tex_A, w_width, g.gl.RGBA32F, g.gl.RGBA, g.gl.FLOAT);

/* interaction */
let interact = 0;
let cursor = [ 120, 120 ];
let radius = 10;

g.makeUniform(g.prg.psim, "cursor", "2fv");
g.setUniform(g.prg.psim, "cursor", new Float32Array(cursor));

g.makeUniform(g.prg.psim, "radius", "1f");
g.setUniform(g.prg.psim, "radius", radius);

g.makeUniform(g.prg.pimg, "cursor", "2fv");
g.setUniform(g.prg.pimg, "cursor", new Float32Array(cursor));

g.makeUniform(g.prg.pimg, "radius", "1f");
g.setUniform(g.prg.pimg, "radius", radius);

window.addEventListener('wheel', function (e) {
	if (e.deltaY < 0) {
		radius = Math.min(40, radius + 1);
	} else {
		radius = Math.max(3, radius - 1);
	}
});
window.addEventListener('mousedown',	function (e) { interact = 1;  });
window.addEventListener('mouseup',		function (e) { interact = 0; });

window.addEventListener('mousemove', function (e) {
	let rect = g.canv.getBoundingClientRect();
	cursor[0] = (e.clientX - rect.left) * 256 / 720;
	cursor[1] = (720 - (e.clientY - rect.top)) * 256 / 720;
});


g.makeSampler(g.prg.psim, "tex");
g.setSampler(g.prg.psim, "tex", "tex_A");

g.makeSampler(g.prg.pimg, "tex");
g.setSampler(g.prg.pimg, "tex", "tex_A");

g.gl.activeTexture(g.gl.TEXTURE1);
g.gl.bindTexture(g.gl.TEXTURE_2D, g.tex["tex_A"]);

/* set up framebuffers */
g.makeFramebuffer("fb_A", w_width, g.gl.RGBA32F, g.gl.RGBA, g.gl.FLOAT);
g.makeFramebuffer("fb_B", w_width, g.gl.RGBA32F, g.gl.RGBA, g.gl.FLOAT);

/* render first timestep into fb_A */
g.renderToFramebuffer(g.prg.psim, g.gl.TRIANGLE_STRIP, g.fb["fb_A"]);
g.render(g.prg.psim, g.gl.TRIANGLE_STRIP);

let t = 0; let prev_t = 0;
function timestep (t)
{
	window.requestAnimationFrame(timestep);

	if (interact) {
	g.setUniform(g.prg.psim, "cursor", new Float32Array(cursor));
	g.setUniform(g.prg.pimg, "cursor", new Float32Array(cursor));
	}
	g.setUniform(g.prg.psim, "radius", radius*interact);
	g.setUniform(g.prg.pimg, "radius", radius*interact);

	for (let i = 0; i < 4; ++i) {
		g.setSampler(g.prg.psim, "tex", "_tex-fb_A");
		g.renderToFramebuffer(g.prg.psim, g.gl.TRIANGLE_STRIP, g.fb["fb_B"]);

		g.setSampler(g.prg.psim, "tex", "_tex-fb_B");
		g.renderToFramebuffer(g.prg.psim, g.gl.TRIANGLE_STRIP, g.fb["fb_A"]);
	}

	g.setSampler(g.prg.pimg, "tex", "_tex-fb_B");
	g.render(g.prg.pimg, g.gl.TRIANGLE_STRIP);

}
window.requestAnimationFrame(timestep);
