const GL = function (canv)
{
	this.canv = canv;
	this.gl = canv.getContext("webgl2");

	if (!this.gl) {
		throw "error: webgl context not supported.";
	}
	let ext = this.gl.getExtension("EXT_color_buffer_float");

	if (!ext) {
		throw "error: floating point color buffer not supported.";
	}

	this.sh = {};
	this.prg = {};

	this.tex = {};
	this.fb = {};
}

GL.prototype.makeShader = function (id, src, type)
{
	const gl = this.gl;
	
	const sh = gl.createShader(type);
	gl.shaderSource(sh, src);
	gl.compileShader(sh);

	if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		this.sh[id] = sh;
		return sh;
	}
	console.log(gl.getShaderInfoLog(sh));
	gl.deleteShader(sh);

	throw "error: failed to compile shader.";
}

GL.prototype.makeProgram = function (id, vsh, fsh)
{
	const gl = this.gl;

	const prog = gl.createProgram();
	gl.attachShader(prog, vsh);
	gl.attachShader(prog, fsh);
	gl.linkProgram(prog);

	if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {

		this.prg[id] = {
			prog: prog,
			unif: {},
			samp: [],
			atrb: {},
			verts: {
				count: 0,
				type: gl.TRIANGLES,
			}
		};

		const prg = this.prg[id];
		prg.makeUniform = function (name, type) {
			gl.makeUniform(prg, name, type); };
		prg.setUniform = function (name, val) {
			gl.setUniform(prg, name, val); };

		return this.prg[id];
	}

	console.log(gl.getProgramInfoLog(prog));
	gl.deleteProgram(prog);
	throw "error: failed to link program.";
}

GL.prototype.makeUniform = function (prg, name, type)
{
	const gl = this.gl;
		
	const loc = gl.getUniformLocation(prg.prog, name);
	if (loc === null) {
		throw "error: uniform " + name + " not found.";
	}

	prg.unif[name] = {
		loc: loc,
		type: type
	}

	return prg.unif[name];
}

GL.prototype.setUniform = function (prg, name, val)
{
	const gl = this.gl;
	gl.useProgram(prg.prog);

	const u = prg.unif[name];
	if (u === undefined) {
		throw "error: " + name + " not a known uniform.";
	}
	gl["uniform" + u.type](u.loc, val);
}

GL.prototype.makeSampler = function (prg, name)
{
	const gl = this.gl;
	if (gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
		< prg.samp.length+2) {
		throw "error: too many samplers.";
	}

	this.makeUniform(prg, name, "1i");
	prg.samp[name] = null;
}
GL.prototype.setSampler = function (prg, name, tex_name)
{
	const s = prg.samp[name];
	if (s === undefined) {
		throw "error: " + name + " not a known sampler.";
	}

	prg.samp[name] = tex_name;
}

GL.prototype.assignSamplers = function (prg)
{
	/* binds textures to units and points samplers to the
	 * correct units. */
	const gl = this.gl;
	
	let i = 1;
	for (let s in prg.samp) {
		const tex = this.tex[prg.samp[s]];

		gl.activeTexture(gl["TEXTURE" + i]);
		gl.bindTexture(gl.TEXTURE_2D, tex);

		this.setUniform(prg, s, i);
		++i;
	}

}

GL.prototype.makeAttributeBuffer = function (prg, name, size, type, mode)
{
	const gl = this.gl;
	
	const loc = gl.getAttribLocation(prg.prog, name);
	if (loc === null) {
		throw "error: attribute " + name + " not found.";
	}

	const buf = gl.createBuffer();
	gl.enableVertexAttribArray(loc);

	prg.atrb[name] = {
		loc: loc,
		type: type,
		mode: mode || gl.STATIC_DRAW,
		buf: buf,
		size: size,
	}
}

GL.prototype.setAttributeBuffer = function (prg, name, val)
{
	const gl = this.gl;
	const a = prg.atrb[name];
	if (a === undefined) {
		throw "error: " + name + " not a know attribute.";
	}

	const vcount = val.length/a.size;
	if (!prg.verts.count) {
		prg.verts.count = vcount;
	}
	if (vcount !== prg.verts.count) {
		console.warn("buffer data for different attributes " +
		"have inconsistent vertex counts.");
	}

	//gl.useProgram(prg.prog);
	gl.bindBuffer(gl.ARRAY_BUFFER, a.buf);
	gl.vertexAttribPointer(a.loc, a.size, a.type, false, 0, 0);
	gl.bufferData(gl.ARRAY_BUFFER, val, a.mode);

}


GL.prototype.makeTexture = function (name)
{
	const gl = this.gl;
	const tex = gl.createTexture();

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, tex);

	this.tex[name] = tex;
}

GL.prototype.setTexture = function (name, data, size, i_format, format, type)
{
	const gl = this.gl;
	const tex = this.tex[name];
	if (tex === undefined) {
		throw "error: " + name + " not a known texture object.";
	}

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, tex);

	gl.texImage2D(gl.TEXTURE_2D, 0, i_format, size, size,
		0, format, type, data);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

GL.prototype.makeFramebuffer = function (name, size, i_format, format, type)
{
	const gl = this.gl;
	const fb = gl.createFramebuffer();

	const texname = "_tex-" + name;
	this.makeTexture(texname);
	this.setTexture(texname, null, size, i_format, format, type);

	this.fb[name] = {
		fbuf: fb,
		tex: this.tex[texname]
	};
}

GL.prototype.render = function (prg, type, target)
{
	const gl = this.gl;

	target = target || null;
	gl.bindFramebuffer(gl.FRAMEBUFFER, target);

	if (type) {
		prg.verts.type = type;
	}

	this.assignSamplers(prg);

	gl.useProgram(prg.prog);
	gl.drawArrays(type, 0, prg.verts.count);
}

GL.prototype.renderToFramebuffer = function (prg, type, fb)
{
	const gl = this.gl;

	gl.bindFramebuffer(gl.FRAMEBUFFER, fb.fbuf);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D, fb.tex, 0);

	g.render(prg, type, fb.fbuf);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
