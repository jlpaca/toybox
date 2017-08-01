
var cursor = [200.0, 0, 0];
var cursorLocation;

var RUN = true;
var RUNLocation;

function bindHandlers(){
	canvas.addEventListener('mousemove', mousemoveHandler);
	canvas.addEventListener('mousedown', mousedownHandler);
	canvas.addEventListener('mouseup', mouseupHandler);
	document.addEventListener('keydown', keydownHandler);

	cursorLocation = gl.getUniformLocation(program, 'cursor');
	RUNLocation = gl.getUniformLocation(program, 'RUN');

	gl.uniform3f(cursorLocation, cursor[0], cursor[1], cursor[2]);
	gl.uniform1i(RUNLocation, RUN);
}
function mousemoveHandler(e){
	var rect = canvas.getBoundingClientRect();
	cursor[0] = Math.floor(e.clientX - rect.left);
	cursor[1] = rect.height-Math.floor(e.clientY - rect.top);
	//console.log(cursor);
}
function mousedownHandler(e){
	var rect = canvas.getBoundingClientRect();
	cursor[0] = Math.floor(e.clientX - rect.left);
	cursor[1] = rect.height-Math.floor(e.clientY - rect.top);
	cursor[2] = (e.which < 2 ? -1.0 : 1.0);
	//if(!RUN){ RUN = true; timestep(); }
	//console.log(e);
}
function mouseupHandler(e){
	DRAWING = false;
	cursor[2] = 0.0;
	//console.log('up');
}
function keydownHandler(e){
	console.log(e.keyCode);
	if(e.keyCode == 32){
		e.preventDefault();
		RUN = !RUN;
	}
	else if(e.keyCode == 82){ killAll(); }
}

//canvas stuff starts here

var canvas;
var gl;
var program;

function initGL(){
	canvas = document.getElementById('world');
	gl = canvas.getContext('webgl');

	gl.clearColor(0.1, 0.0, 0.04, 1);
	//gl.enable(gl.DEPTH_TEST);
	//gl.depthFunc(gl.LEQUAL);
	//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	initShaders();
	initBuffers();
	initfBuffers();

	timestep();
}

var L = 512;
var fBufferA;
var fBufferB;
var textureA;
var textureB;
var texLocation;

function initfBuffers(){
	//Always draw full square. this never changes.
	gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
	gl.vertexAttribPointer(qLocation, 2, gl.FLOAT, false, 0, 0);

	//create textureA
	textureA = gl.createTexture();

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureA);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, L, L,
								 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	gl.bindTexture(gl.TEXTURE_2D, null);

	//create textureB
	textureB = gl.createTexture();

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textureB);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, L, L,
								 0, gl.RGBA, gl.UNSIGNED_BYTE, generateTexdata());

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	gl.bindTexture(gl.TEXTURE_2D, null);

	//create framebuffer A & attach textureA to fBufferA
	fBufferA = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferA);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureA);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
							gl.TEXTURE_2D, textureA, 0);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);

	//create framebuffer B & attach textureA to fBufferB
	fBufferB = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferB);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textureB);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
							gl.TEXTURE_2D, textureB, 0);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);

	//render from texture slot 0
	texLocation = gl.getUniformLocation(program, 'utex');
	//gl.uniform1i(texLocation, 1);

}

var renderA = false;
function swapBuffers(){
	renderA = !renderA;
	if(renderA){ //read from B, render to A
		gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferA);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, textureB);
		gl.uniform1i(texLocation, 1);
	} else {
		gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferB);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textureA);
		gl.uniform1i(texLocation, 0);
	}
}


function generateTexdata() {
	var data = [];

	
	var alive;
	for(var j = 0; j < L; ++j){
	for(var i = 0; i < L; ++i){
		alive = Math.random()>0.5;
		data[4*(j*L+i)    ] = alive > 0.5 ? 255 : 0.1*255;
		data[4*(j*L+i) + 1] = alive > 0.5 ? 255 : 0;
		data[4*(j*L+i) + 2] = alive > 0.5 ? 255 : 0.04*255;
		data[4*(j*L+i) + 3] = 255;
	}}

	data = new Uint8Array(data);
	return data;
}


var qLocation; 
function initShaders(){
	var fragShader = getShader(gl, 'fragShader');
	var vertShader = getShader(gl, 'vertShader');

	program = gl.createProgram();
	gl.attachShader(program, vertShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	gl.useProgram(program);

	qLocation = gl.getAttribLocation(program, 'q');
	gl.enableVertexAttribArray(qLocation);
}

function getShader(gl, id){
	var shaderScript = document.getElementById(id);
	var shaderSource = shaderScript.textContent;
	var shader;
	if(shaderScript.type == 'x-shader/x-vertex'){
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else if (shaderScript.type == 'x-shader/x-fragment'){
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else {
		return null;
	}
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
	return shader;
}

var squareBuffer;
function initBuffers(){
	squareBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);

	var verts = [
				-1.0, 1.0,
				1.0, 1.0,
				-1.0, -1.0,
				1.0, -1.0,
				];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function timestep(){
	swapBuffers();
	drawScene();

	window.requestAnimationFrame(timestep);
}

function killAll(){
	if(!renderA){
		gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferB);
	} else {
		gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferA);
	}
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	timestep();
}

function drawScene(){
	//pass state variables: cursor position & simulation timestepping
	gl.uniform3f(cursorLocation, cursor[0], cursor[1], cursor[2]);
	gl.uniform1i(RUNLocation, RUN);
	//render to texture
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);


	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	//render to screen
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

}


