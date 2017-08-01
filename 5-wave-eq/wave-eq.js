
var dx = 1;
var dt = 0.2;
var c = 1;

var alpha = c*dt/dx;
var asqrd = alpha*alpha;
var Q = (1-alpha)/(1+alpha);

var L = 100;//60;

var u = [];
var u_prev = [];
var u_next = [];

var GRID_SIZE = 1.8/L;
var GRID_HEIGHT = 0.24*L;
var ORIGIN = -0.9+0.5*GRID_SIZE;
var verts = [];
var index = [];

//data for picking
var MAPverts = [];
function initMAPverts(){
	for(var j = 0; j < L; ++j){
	for(var i = 0; i < L; ++i){
		//x, y, z
		MAPverts[6*(i+j*L)  ] = ORIGIN+i*GRID_SIZE;
		MAPverts[6*(i+j*L)+1] = ORIGIN+j*GRID_SIZE;
		MAPverts[6*(i+j*L)+2] = 0;

		//R, G, B
		MAPverts[6*(i+j*L)+3] = i/L;
		MAPverts[6*(i+j*L)+4] = j/L;
		MAPverts[6*(i+j*L)+5] = 0;
	}}
}

function initData(){
	//init physics data
	for(var i = 0; i < L; ++i){
		u[i] = [];
		u_prev[i] = [];
		u_next[i] = [];
	for(var j = 0; j < L; ++j){
		
		u[i][j] = 0;//-0.7*Math.exp(-0.2*Math.sqrt((i-L/2)*(i-L/2)+(j-L/2)*(j-L/2)));
		u_prev[i][j] = u[i][j];
		u_next[i][j] = 0;

	}}

	fwop(0.0, 0.0, 1, 1); //gaussian-cosine wave

	//init render data
	for(var j = 0; j < L; ++j){
	for(var i = 0; i < L; ++i){
		//x, y, z
		verts[6*(i+j*L)  ] = ORIGIN+i*GRID_SIZE;
		verts[6*(i+j*L)+1] = ORIGIN+j*GRID_SIZE;
		verts[6*(i+j*L)+2] = u[i][j]*GRID_SIZE*GRID_HEIGHT;

		//R, G, B
		verts[6*(i+j*L)+3] = 0;
		verts[6*(i+j*L)+4] = 0;
		verts[6*(i+j*L)+5] = 0;
	}}
	initMAPverts();

	//init index set
	for(var j = 0; j < L-1; ++j){
	index[index.length] = L*j;
	index[index.length] = L*j;
	for(var i = 0; i < L; ++i){
		index[index.length] = i+j*L;
		index[index.length] = i+(j+1)*L;
	}
	index[index.length] = L*(j+1)-1;
	index[index.length] = L*(j+1)-1;
	}
}
initData();

function fwop(x, y, height, scale){
	//fwopsign *= -1;

	x = (x+1)*0.5;
	y = (y+1)*0.5;
	var r = 0;

	var accum = 0;
	var d = 0;
	for(var i = 0; i < L; ++i){
	for(var j = 0; j < L; ++j){
		r = 90/scale*((i/L-x)*(i/L-x)+(j/L-y)*(j/L-y));
		//u[i][j] += fwopsign*0.5*Math.exp(-0.2*Math.sqrt((i-x)*(i-x)+(j-y)*(j-y)));
		d = -height*0.7*Math.cos(Math.sqrt(Math.E*r))*Math.exp(-r);
		u[i][j] += d;
		u_prev[i][j] += d;
		accum += d;
	}}

	if(SKID){accum += 2.5;} //magic-number floating point compensation for default SKID settings;

	accum = accum/L/L; //normalize

	for(var i = 0; i < L; ++i){
	for(var j = 0; j < L; ++j){
		u[i][j] -= accum; u_prev[i][j] -= accum;
	}}
}

var transmission = 0.05;
var suppress = 8e-5; //corrects float-point drift by relaxing towards 0
function integrate(){
	for(var i = 1; i < L-1; ++i){
	for(var j = 1; j < L-1; ++j){
		u_next[i][j] =
		asqrd*(u[i+1][j]+u[i-1][j]+u[i][j+1]+u[i][j-1])
		+2*u[i][j]*(1-2*asqrd)
		-u_prev[i][j];
	}}


	//mixed(?)boundary conditions - VERY physically inaccurate but somehow works, kinda
	for(var i = 0; i < L; ++i){
		u_next[i][0] =
		((-u_prev[i][0]+2*(1-asqrd)*u[i][0] +2*asqrd*u[i][1])*(1-transmission) +
		(u[i][1]-Q*u_next[i][1]+Q*u[i][0])*transmission)*(1-suppress);

		u_next[i][L-1] =
		((-u_prev[i][L-1]+2*(1-asqrd)*u[i][L-1] +2*asqrd*u[i][L-2])*(1-transmission) +
		(u[i][L-2]-Q*u_next[i][L-2]+Q*u[i][L-1])*transmission)*(1-suppress);;
	}
	for(var j = 0; j < L; ++j){
		u_next[0][j] =
		((-u_prev[0][j]+2*(1-asqrd)*u[0][j] +2*asqrd*u[1][j])*(1-transmission) +
		(u[1][j]-Q*u_next[1][j]+Q*u[0][j])*transmission)*(1-suppress);;
		u_next[L-1][j] =
		((-u_prev[L-1][j]+2*(1-asqrd)*u[L-1][j] +2*asqrd*u[L-2][j])*(1-transmission) +
		(u[L-2][j]-Q*u_next[L-2][j]+Q*u[L-1][j])*transmission)*(1-suppress);;
	}
	
	//Neumann boundaries
	/*
	for(var i = 0; i < L; ++i){
		u_next[i][0] = -u_prev[i][0]+2*(1-asqrd)*u[i][0] +2*asqrd*u[i][1];
		u_next[i][L-1] = -u_prev[i][L-1]+2*(1-asqrd)*u[i][L-1] +2*asqrd*u[i][L-2];
	}
	for(var j = 0; j < L; ++j){
		u_next[0][j] = -u_prev[0][j]+2*(1-asqrd)*u[0][j] +2*asqrd*u[1][j];
		u_next[L-1][j] = -u_prev[L-1][j]+2*(1-asqrd)*u[L-1][j] +2*asqrd*u[L-2][j];
	}
	*/

	//Sommerfeld boundaries
	/*
	for(var i = 0; i < L; ++i){
		u_next[i][0] = (u[i][1]-Q*u_next[i][1]+Q*u[i][0]);
		u_next[i][L-1] = (u[i][L-2]-Q*u_next[i][L-2]+Q*u[i][L-1]);	
	}
	for(var j = 0; j < L; ++j){
		u_next[0][j] = (u[1][j]-Q*u_next[1][j]+Q*u[0][j]);
		u_next[L-1][j] = (u[L-2][j]-Q*u_next[L-2][j]+Q*u[L-1][j]);
	}
	*/

	for(var i = 0; i < L; ++i){
	for(var j = 0; j < L; ++j){ u_prev[i][j] = u[i][j]; }}
	for(var i = 0; i < L; ++i){
	for(var j = 0; j < L; ++j){ u[i][j] = u_next[i][j]; }}
}

var steps_per_frame = 6;
function timestep(){
	render();
	for(var i = 0; i < steps_per_frame; ++i){integrate();}

	requestAnimationFrame(timestep);
}

//physics end here, start webGL gymnastics


var canvas;
var gl;
function initWebGL(){
	canvas = document.getElementById('world');
	gl = canvas.getContext('webgl');

	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;

	initFrameBuffer();

	initShaders();
	initProgram();
	initBuffers();
	initAttribs();
	initUniform();

	gl.clearColor(0.706, 0.95, 0.95, 1);
	gl.enable(gl.DEPTH_TEST);


	timestep();
}

function bindHandlers(){
	document.addEventListener('click', clickHandler);
	document.addEventListener('mousemove', mousemoveHandler);
	document.addEventListener('keydown', keydownHandler);
}

//parameters
var SKID = false;
var WAVE_SCALE = 0.8;
var WAVE_MAGNITUDE = 0.8;

var cursor = [0, 0];
function mousemoveHandler(e){
	var rect = canvas.getBoundingClientRect();
	cursor.x = Math.floor(event.clientX - rect.left);
	cursor.y = Math.floor(event.clientY - rect.top);
}
function clickHandler(e){
	var rect = canvas.getBoundingClientRect();
	cursor.x = Math.floor(event.clientX - rect.left);
	cursor.y = Math.floor(event.clientY - rect.top);

	CAPTURE_MAP = true;
}
function keydownHandler(e){
	if(e.keyCode == 32){ e.preventDefault(); // space
		SKID = !SKID;

	} else if (e.keyCode == 38){ e.preventDefault(); // up
		WAVE_MAGNITUDE = Math.max(0.2, Math.min(3.0, WAVE_MAGNITUDE+0.2));
		//console.log(WAVE_MAGNITUDE);
	} else if (e.keyCode == 40){ e.preventDefault(); // left
		WAVE_MAGNITUDE = Math.max(0.2, Math.min(3.0, WAVE_MAGNITUDE-0.2));
		//console.log(WAVE_MAGNITUDE);

	} else if (e.keyCode == 39){ e.preventDefault(); // right
		WAVE_SCALE = Math.max(0.2, Math.min(3.0, WAVE_SCALE+0.2));
		//console.log(WAVE_SCALE);
	} else if (e.keyCode == 37){ e.preventDefault(); // down
		WAVE_SCALE = Math.max(0.2, Math.min(3.0, WAVE_SCALE-0.2));
		//console.log(WAVE_SCALE);
	}
}

var framebuffer;
var texture;
var FBFR_L = 720; //framebuffer size
var MAP;
function initFrameBuffer(){

	MAP = new Uint8Array(FBFR_L * FBFR_L* 4);

	framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

	texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FBFR_L, FBFR_L, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, FBFR_L, FBFR_L);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

var vertShader;
var fragShader;
function initShaders(){
	var vertShaderTxt = [
	'precision mediump float;',
	'attribute vec3 vertPosition;',
	'attribute vec3 vertColor;',
	'varying vec3 fragColor;',
	'uniform mat4 mWorld;',
	'uniform mat4 mView;',
	'uniform mat4 mProj;',
	'void main(){',
	'	fragColor = vertColor;',
	'	gl_Position = mProj*mView*mWorld*vec4(vertPosition, 1.0);',
	'}'].join('\n');

	var fragShaderTxt = [
	'precision mediump float;',
	'varying vec3 fragColor;',
	'void main(){',
	'	gl_FragColor = vec4(fragColor, 1.0);',
	'}'].join('\n');

	vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, vertShaderTxt);
	gl.compileShader(vertShader);
	//console.log(gl.getShaderInfoLog(vertShader));

	fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragShaderTxt);
	gl.compileShader(fragShader);
	//console.log(gl.getShaderInfoLog(fragShader));
}

var program;
function initProgram(){
	program = gl.createProgram();

	gl.attachShader(program, vertShader);
	gl.attachShader(program, fragShader);

	gl.linkProgram(program);

	gl.useProgram(program);

}

var matWorldLocation;
var matViewLocation;
var matProjLocation;
var matWorld;
var matView;
var matProj;
var matI = new Float32Array([1, 0, 0, 0,
							 0, 1, 0, 0,
							 0, 0, 1, 0,
							 0, 0, 0, 1]);


function initUniform(){
	matWorldLocation = gl.getUniformLocation(program, 'mWorld');
	matViewLocation = gl.getUniformLocation(program, 'mView');
	matProjLocation = gl.getUniformLocation(program, 'mProj');

	matWorld = [];//new Float32Array(16);
	matView = [];//new Float32Array(16);
	matProj = [];//new Float32Array(16);

	//mat4 is originally dependent on gl-matrix
	//mat4.rotate(matWorld, matI, 1.1, I, [1, 0, 0]); console.log(matWorld);		
	var tilt = 1.15;
	matWorld = [1, 0, 0, 0,
				0,  Math.cos(tilt), Math.sin(tilt), 0,
				0, -Math.sin(tilt), Math.cos(tilt), 0,
				0, 0, 0, 1]; //world
	
	
	mat4.lookAt(matView,
				[0, 0, -3.2],
				[0, 0, 0],
				[0, 1, 0]
				); //camera

	//mat4.perspective(matProj, Math.PI/4, canvas.width/canvas.height, 0.1, 1e+3); 
	var aspect_ratio = canvas.clientWidth/canvas.clientHeight;
	var near_z = 0.1; var far_z = 1e+3;
	var half_alpha = Math.PI/8;
	
	//z-value shenanigans taken care of by webGL

	matProj = mat4perspective(half_alpha, aspect_ratio, near_z, far_z)

	gl.uniformMatrix4fv(matWorldLocation, gl.FALSE, new Float32Array(matWorld));
	gl.uniformMatrix4fv(matViewLocation, gl.FALSE, new Float32Array(matView));
	gl.uniformMatrix4fv(matProjLocation, gl.FALSE, new Float32Array(matProj));


}
function mat4perspective(ha, ar, nz, fz){
	return [1/ar/Math.tan(ha), 0, 0, 0,
			0, 1/Math.tan(ha), 0, 0,
			0, 0, (nz+fz)/(nz-fz), -1,
			0, 0, 2*fz*nz/(nz-fz), 0];
}
/*
//matrix rotation in 3d about an axis.
//Useful, but cumbersome here.
//Saving for later reference.
var theta = 0.1;
function mat4rotation(theta, axis){
	return [
	Math.cos(theta)+axis[0]*axis[0]*(1-Math.cos(theta)),
	axis[0]*axis[1]*(1-Math.cos(theta)) + axis[2]*Math.sin(theta),
	axis[2]*axis[0]*(1-Math.cos(theta)) - axis[1]*Math.sin(theta),
	0,

	axis[0]*axis[1]*(1-Math.cos(theta)) - axis[2]*Math.sin(theta),
	Math.cos(theta)+axis[1]*axis[1]*(1-Math.cos(theta)),
	axis[1]*axis[2]*(1-Math.cos(theta)) + axis[0]*Math.sin(theta),
	0,

	axis[0]*axis[2]*(1-Math.cos(theta)) + axis[1]*Math.sin(theta),
	axis[1]*axis[2]*(1-Math.cos(theta)) - axis[0]*Math.sin(theta),
	Math.cos(theta)+axis[2]*axis[2]*(1-Math.cos(theta)),
	0,

	0, 0, 0, 1
	];
}

//note that matrices are ALWAYS column-major in webGL.
*/


var vertBuffer;
var indexBuffer;
function initBuffers(){
	vertBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,
					new Float32Array(verts),
					gl.DYNAMIC_DRAW);
	vertBuffer.itemsize = 6;
	vertBuffer.itemcount = 4;
	
	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
					new Uint16Array(index),
					gl.DYNAMIC_DRAW);
	indexBuffer.count = index.length;
}

function initAttribs(){
	var vertPositionLocation = gl.getAttribLocation(program, 'vertPosition');
	var vertColorLocation = gl.getAttribLocation(program, 'vertColor');

	gl.vertexAttribPointer(
		vertPositionLocation, //attrib location
		3, //# ofelems per attrib
		gl.FLOAT, //type of elem
		gl.FALSE,
		vertBuffer.itemsize*Float32Array.BYTES_PER_ELEMENT, //size of individual vertex
		0 //offset from beginning to this attrib.
	);
	gl.vertexAttribPointer(
		vertColorLocation, //attrib location
		3, //# ofelems per attrib
		gl.FLOAT, //type of elem
		gl.FALSE,
		vertBuffer.itemsize*Float32Array.BYTES_PER_ELEMENT, //size of individual vertex
		3*Float32Array.BYTES_PER_ELEMENT  //offset
	);

	gl.enableVertexAttribArray(vertPositionLocation);
	gl.enableVertexAttribArray(vertColorLocation);
}

var CAPTURE_MAP = false;
function render(){
	//update render data
	for(var j = 0; j < L; ++j){
	for(var i = 0; i < L; ++i){
		//z
		verts[6*(i+j*L)+2] = u[i][j]*GRID_SIZE*GRID_HEIGHT;

		//R, G, B
		verts[6*(i+j*L)+3] = 1.0-u[i][j];
		verts[6*(i+j*L)+4] = 0.6-2*u[i][j];
		verts[6*(i+j*L)+5] = 0.4;
	}}

	//bind render buffer - render to screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	drawscene();

	//bind render buffer - render to map
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	drawMAP();
	if(CAPTURE_MAP || SKID){
		wave_event();
		CAPTURE_MAP = false;
	}

}
function wave_event(){
		gl.readPixels(0, 0, FBFR_L, FBFR_L, gl.RGBA, gl.UNSIGNED_BYTE, MAP);

		var pixel;	
		if(cursor.x >= FBFR_L || cursor.y >= FBFR_L
			|| cursor.x < 0 || cursor.y < 0){
			//do nothing
		} else {
			var addr = (FBFR_L - 1 - cursor.y)*FBFR_L*4 + cursor.x*4;
			pixel = [MAP[addr], MAP[addr+1], MAP[addr+2]];
			//R and G values denote position, only trigger event if B is 0 (inside domain)
			if(MAP[addr+2] == 0){
				//insize domain. calculate position:
				var X = MAP[addr  ]/255;
				var Y = MAP[addr+1]/255;

				//create wave there.
				if(CAPTURE_MAP){ fwop(X*2-1, Y*2-1, WAVE_MAGNITUDE, WAVE_SCALE); }
				if(SKID){ fwop(X*2-1, Y*2-1, 0.1, 0.6); }
			}
		}
}


var ROT_SPEED = 3e-3;
function drawscene(){
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(verts));

	mat4.rotate(matWorld, matWorld, ROT_SPEED, [0, 0, 1]);
	gl.uniformMatrix4fv(matWorldLocation, gl.FALSE, new Float32Array(matWorld));

	//draw calls
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.drawElements(gl.TRIANGLE_STRIP,
	indexBuffer.count, //draw 4 vertices
	gl.UNSIGNED_SHORT,
	0 //skip 0 vertices
	);
}
function drawMAP(){
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(MAPverts));

	mat4.rotate(matWorld, matWorld, ROT_SPEED, [0, 0, 1]);
	gl.uniformMatrix4fv(matWorldLocation, gl.FALSE, new Float32Array(matWorld));

	//draw calls
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.drawElements(gl.TRIANGLE_STRIP,
	indexBuffer.count, //draw 4 vertices
	gl.UNSIGNED_SHORT,
	0 //skip 0 vertices
	);
}



