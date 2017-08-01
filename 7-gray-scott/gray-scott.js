var canvas;
var context;

var program;
var program2;

var texA;
var fbuffA;
var texB;
var fbuffB;

var texloc;

var L = 512;

// simulation parameters
var Dr = 0.8;//0.2;
var Dg = 0.4;//0.1;
var f = 0.037;
var k = 0.060;


function initGL(){
	canvas = document.getElementById("world");
	context = canvas.getContext("webgl");

	var vertsource = document.getElementById("vertsource").text;
	var fragsource = document.getElementById("fragsource").text;
	var vertshader = createShader(context.VERTEX_SHADER,   vertsource);
	var fragshader = createShader(context.FRAGMENT_SHADER, fragsource);

	var fragsource2 = document.getElementById("fragsource2").text;
	var fragshader2 = createShader(context.FRAGMENT_SHADER, fragsource2);

	program = createProgram(vertshader, fragshader);
	program2 = createProgram(vertshader, fragshader2);

	context.useProgram(program);

	initSquare();

	context.getExtension("OES_texture_float");

	texA = setupTexture(null);
	fbuffA = setupfBuffer(texA);

	texB = setupTexture(texgen());
	fbuffB = setupfBuffer(texB);

	texloc = context.getUniformLocation(program, "tex");

	bindHandlers();

	timestep();

	
}

var cursor = [0.5, 0.5, 0.03];
var kincrement = 0;
var fincrement = 0;
function keydownHandler(e){
	console.log(e.which);
	if (e.which == 70){ fincrement =  0.0002;	} // F KEY
	if (e.which == 68){ fincrement = -0.0002;	} // D KEY
	if (e.which == 75){ kincrement =  0.0002;	} // K KEY
	if (e.which == 74){ kincrement = -0.0002;	} // J KEY

}
function keyupHandler(e){
	//console.log(e.which + "UP");
	if (e.which == 70){ fincrement = 0; } // F KEY
	if (e.which == 68){ fincrement = 0; } // D KEY
	if (e.which == 75){ kincrement = 0; } // K KEY
	if (e.which == 74){ kincrement = 0; } // J KEY
}
function mousemoveHandler(e){
	var rect = document.getElementById('world').getBoundingClientRect()
	cursor[0] =     (e.clientX - rect.left)/rect.width;
	cursor[1] = 1.0-(e.clientY - rect.top)/rect.height;
}
function wheelHandler(e){
	e.preventDefault();
	if (e.deltaY < 0) {
		cursor[2] += 0.02;
	} else {
		cursor[2] -= 0.02;
	}
	cursor[2] = Math.min(Math.max(0.01, cursor[2]), 0.16);
}

var Drloc, Dgloc, kloc, floc, cursorloc;
function bindHandlers(){
	Drloc = context.getUniformLocation(program, "Dr");
	Dgloc = context.getUniformLocation(program, "Dg");
	kloc = context.getUniformLocation(program, "k");
	floc = context.getUniformLocation(program, "f");
	cursorloc = context.getUniformLocation(program, "cursor");

	window.addEventListener('keydown', keydownHandler);
	window.addEventListener('keyup',   keyupHandler  );
	document.addEventListener('mousemove', mousemoveHandler);
	document.addEventListener('wheel', wheelHandler);
}
function passParams(){
	context.uniform1f(Drloc, Dr);
	context.uniform1f(Dgloc, Dg);
	context.uniform1f(kloc, k);
	context.uniform1f(floc, f);
	context.uniform3f(cursorloc, cursor[0], cursor[1], cursor[2]);
}

var iter = 16;
function timestep(){

	// user interaction
	f += fincrement;
	k += kincrement;
	if (fincrement != 0 || kincrement != 0){
		console.log("f: " + f.toFixed(4) +
			  "  k: " + k.toFixed(4));
	}

	// timestep the simulation
	context.useProgram(program);
	passParams();
	for(var i = 0; i < iter; ++i){
		swapBuffers();

		drawr();
	}

	context.useProgram(program2);
	context.bindFramebuffer(context.FRAMEBUFFER, null);
	drawr();

	window.requestAnimationFrame(timestep);
}

function drawr(){
	context.clear(context.COLOR_BUFFER_BIT);
	context.viewport(0, 0, L, L);
	context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
}

function setupTexture(data){
	context.activeTexture(context.TEXTURE0);
	var tex = context.createTexture();
	context.bindTexture(context.TEXTURE_2D, tex);
	context.texImage2D(context.TEXTURE_2D, 0, context.RGBA,
					 L, L, 0, context.RGBA,
					 context.FLOAT, data); // use floating point texture
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.REPEAT);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.REPEAT);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);

	context.bindTexture(context.TEXTURE_2D, null);
	return tex;
}

var renderA = false;
function swapBuffers(){
	renderA = !renderA;
	if (renderA) { // read from B render to A
		context.bindFramebuffer(context.FRAMEBUFFER, fbuffA);
		context.activeTexture(context.TEXTURE1);
		context.bindTexture(context.TEXTURE_2D, texB);
		context.uniform1i(texloc, 1);
	} else {
		context.bindFramebuffer(context.FRAMEBUFFER, fbuffB);
		context.activeTexture(context.TEXTURE0);
		context.bindTexture(context.TEXTURE_2D, texA);
		context.uniform1i(texloc, 0);
	}

}

function setupfBuffer(tex){
		
	var fbuff = context.createFramebuffer();
	context.bindFramebuffer(context.FRAMEBUFFER, fbuff);
	context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0,
					context.TEXTURE_2D, tex, 0);
	context.bindFramebuffer(context.FRAMEBUFFER, null);
	return fbuff;
}



function texgen(){
	
	var t = [];
	var seeds = 64;
	var cntrx = [];
	var cntry = [];
	var radii = [];
	for(var i = 0; i < seeds; ++i){
		cntrx.push(Math.random()*L);
		cntry.push(Math.random()*L);
		radii.push(Math.random()*L/32);
	}
	for(var i = 0; i < L; ++i){
	for(var j = 0; j < L; ++j){

		var G = false;
		for(var k = 0; k < seeds; ++k){
			if ((i-cntrx[k])*(i-cntrx[k]) +
			    (j-cntry[k])*(j-cntry[k]) <
			     radii[k]*radii[k]){
				G = true;
			}
		}

		t[4*(j*L+i)  ] = G ? 0 : 1;
		t[4*(j*L+i)+1] = G ? 1 : 0;
		t[4*(j*L+i)+2] = 0;
		t[4*(j*L+i)+3] = 1;
	}}
	/* 
	var t = [];
	var R = L/190; var A = true;
	for(var i = 0; i < L; ++i){
	for(var j = 0; j < L; ++j){
		A = true;
		if ((i-L/2)*(i-L/2) +
		    (j-L/2)*(j-L/2) <
		     R*R){
			A = false;
		}
		t[4*(j*L+i)  ] = A ? 1 : 0;
		t[4*(j*L+i)+1] = A ? 0 : 1;
		t[4*(j*L+i)+2] = 0;
		t[4*(j*L+i)+3] = 1;
	}}
	*/
	return new Float32Array(t);//new Uint8Array(t);

}

function initSquare(){
	var vertqbuff = context.createBuffer();
	var vertqloc  = context.getAttribLocation(program, "vertq");
	context.bindBuffer(context.ARRAY_BUFFER, vertqbuff);

	var squareq = [	1, 1, 1, -1, -1, 1, -1, -1 ];

	context.bufferData(context.ARRAY_BUFFER,
			new Float32Array(squareq),
			context.STATIC_DRAW);

	context.enableVertexAttribArray(vertqloc);
	context.vertexAttribPointer(vertqloc, 2,
			context.FLOAT, false, 0, 0);
}

function createShader(type, source){
	var shader = context.createShader(type);
	context.shaderSource(shader, source);
	context.compileShader(shader);
	//console.log(context.getShaderInfoLog(shader));
	return shader;
}

function createProgram(vertshader, fragshader){
	var program = context.createProgram();
	context.attachShader(program, vertshader);
	context.attachShader(program, fragshader);
	context.linkProgram(program);

	//console.log(context.getProgramInfoLog(program));
	return program;
}
