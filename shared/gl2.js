function makeShader (gl, src, type) {
	const sh = gl.createShader(type);
	gl.shaderSource(sh, src);
	gl.compileShader(sh);
	if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		throw "error compiling shader: " +
		gl.getShaderInfoLog(sh);
	}
	return sh;
}

function makeProgram (gl, vsh, fsh) {
	const prg = gl.createProgram();
	gl.attachShader(prg, vsh);
	gl.attachShader(prg, fsh);
	gl.linkProgram(prg);
	if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
		throw "error linking program: " +
		gl.getProgramInfoLog(prg);
	}
	return prg;
}

function makeTexture (gl, texunit, fi, w, h, f, type, data, minf, magf, ws, wt) {
	const tex = gl.createTexture();
	gl.activeTexture(gl["TEXTURE"+texunit]);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, fi, w, h, 0, f, type, data);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minf);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magf);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, ws);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wt);

	return tex;
}

function makeFramebuffer (gl, tex, texunit) {
	const fbf = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbf);

	gl.activeTexture(gl["TEXTURE"+texunit]);

	gl.framebufferTexture2D(gl.FRAMEBUFFER,
	gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

	return fbf;
}

function makeBuffer (gl, data, drawtype) {
	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, data, drawtype);

	return buf;
}

function setBuffer(gl, prg, loc, buf, batch, type) {
	if (prg) { gl.useProgram(prg); }
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);

	gl.enableVertexAttribArray(loc);
	gl.vertexAttribPointer(loc, batch, type, false, 0, 0);	
}

function setUniform(gl, prg, loc, type, val) {
	if (prg) { gl.useProgram(prg); }
	if (type === "1i") {
		gl.uniform1i(loc, val);
	} else if (type === "1f") {
		gl.uniform1f(loc, val);
	} else if (type === "2f") {
		gl.uniform2f(loc, val[0], val[1]);
	}
}

function clear (gl, buf) {
	gl.bindFramebuffer(gl.FRAMEBUFFER, buf);
	gl.clear(gl.COLOR_BUFFER_BIT);
}

function render (gl, prg, buf, type, offset, count, clr) {
	if (prg) { gl.useProgram(prg); }
	gl.bindFramebuffer(gl.FRAMEBUFFER, buf);
	if (clr === true) { gl.clear(gl.COLOR_BUFFER_BIT); }
	gl.drawArrays(type, offset, count);
}
