var canvas;
var context;

var W = {
X: 72,
Y: 25,
}; //world size

var dx = 10; //grid size
var dt = 1; //timestep
var c = dx/dt; //grid velocity

var steps_per_paint = 6;

$(document).ready(function(){
	
	canvas = document.getElementById('world');
	context = canvas.getContext('2d');

	canvas.width = W.X*dx;
	canvas.height = W.Y*dx;

	context.strokeStyle="#111111";

	init();
	timestep();
});


var B = []; //barrier

var f = []; //distribution function

var nu = 0.005*dx*dx/dt;
var omega = 2/(6*dt*nu/dx/dx+1);

var e = [[0, 0],
		 [1, 0], [0, 1], [-1, 0], [0, -1],
		 [1, 1], [-1, 1], [-1, -1], [1, -1]]; //unit vectors

var w = [4/9,
		 1/9, 1/9, 1/9, 1/9,
		 1/36, 1/36, 1/36, 1/36]; //weights

var inv = [0,
			3, 4, 1, 2,
			7, 8, 5, 6];

var u0 = [0.1*c, 0]; //initial speed

function init(){
	//allocating indeces & space for all them arrays, also initialize

	//barriers
	for(var i = 0; i < W.X; ++i){ B[i] = [];
	for(var j = 0; j < W.Y; ++j){ B[i][j] = false;
	}}

	
	for(var j = 9; j < 15; ++j){ B[10][j] = true;}
	
	//distribution function
	for(var i = 0; i < W.X; ++i){ f[i] = [];
	for(var j = 0; j < W.Y; ++j){ f[i][j] = [];
		for(var k = 0; k < 9; ++k){ f[i][j][k] = 0; }
	}}

	//initial conditions
	for(var i = 0; i < W.X; ++i){
	for(var j = 0; j < W.Y; ++j){
		setequil(i, j, u0, 1);
	}}
}


function stream(){

	//stream - doing directions separately eliminates need for swap memory

	//R&UR
	var k;
	for(var j = W.Y-1; j > 0; --j){
	for(var i = W.X-1; i > 0; --i){
		k = 1; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
		k = 5; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
	}}

	//U&UL
	for(var j = W.Y-1; j > 0; --j){
	for(var i = 0; i < W.X-1; ++i){
		k = 2; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
		k = 6; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
	}}

	//L&DL
	for(var j = 0; j < W.Y-1; ++j){
	for(var i = 0; i < W.X-1; ++i){
		k = 3; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
		k = 7; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
	}}

	//D&DR
	for(var j = 0; j < W.Y-1; ++j){
	for(var i = W.X-1; i > 0; --i){
		k = 4; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
		k = 8; f[i][j][k] = f[i-e[k][0]][j-e[k][1]][k];
	}}

	//handle barriers
	
	for(var i = 0; i < W.X; ++i){
	for(var j = 0; j < W.Y; ++j){
	if(B[i][j]){
		//bounce-back
		var invf = [];
		for(var k = 0; k < 9; ++k){
			invf[k] = f[i][j][inv[k]];
		}
		for(var k = 0; k < 9; ++k){	f[i][j][k] = invf[k]; }
	}
	}}
	

	for(var i = 0; i < W.X; ++i){
	for(var j = 0; j < W.Y; ++j){
		for(var k = 0; k < 9; ++k){
			if(f[i][j][k] < 0){ console.log('f UNSTABLE(stream)'); debugger;}
		}
	}}
}

function setequil(x, y, equ, eqrho) {

		for(var k = 0; k < 9; ++k){
			f[x][y][k] = w[k]*eqrho*(
						1
						+ 3*dot(e[k], equ)/c
						+ 4.5*dot(e[k], equ)*dot(e[k], equ)/(c*c)
						- 1.5*dot(equ, equ)/(c*c)
						);
		}

}
function setboundaries() {
	var bu = u0; //u @ boundary
	
	for(var i = 0; i < W.X; ++i){
		setequil(i, 0, bu, 1);
		setequil(i, W.Y-1, bu, 1);
	}
	
	for(var j = 0; j < W.Y; ++j){
		setequil(0, j, bu, 1);
		setequil(W.X-1, j, bu, 1);
	}
}

function collision(){

	for(var i = 0; i < W.X; ++i){
	for(var j = 0; j < W.Y; ++j){

		//calculate macroscopic quantities
		var rho = 0;
		for(var k = 0; k < 9; ++k){ rho += f[i][j][k]; }

		var u = [0, 0];
		for(var k = 0; k < 9; ++k){
			if(rho == 0){ u[i][j] = [0, 0]; continue; }
			u = sum(u, mul(c*f[i][j][k]/rho, e[k]));
		}

		//calculate equilibrium values & relax
		var feq = 0;

		//precompute stuff for optimization:
		var dotuu = u[0]*u[0]+u[1]*u[1];
		var coef1 = 3/c;
		var coef2 = 4.5/c/c;
		var coef3 = coef2/3;
		var doteu;

		for(var k = 0; k < 9; ++k){
			/*
			feq = rho*w[k]*(
						1
						+ 3*dot(e[k], u)/c
						+ 4.5*dot(e[k], u)*dot(e[k], u)/(c*c)
						- 1.5*dot(u, u)/(c*c)
						);
			*/
			doteu = e[k][0]*u[0]+e[k][1]*u[1];
			feq = rho*w[k]*(
						1
						+ coef1*doteu
						+ coef2*doteu*doteu
						- coef3*dotuu
						);

			f[i][j][k] = (1-omega)*f[i][j][k] + omega*feq;

			if(f[i][j][k] < 0){ console.log('f UNSTABLE(collision)'); debugger; }
		}
	}}
}



function render(){

	context.clearRect(0, 0, canvas.width, canvas.height);

	//context.beginPath();
	for(var i = 0; i < W.X; ++i){
	for(var j = 0; j < W.Y; ++j){
	if(!B[i][j]){
		//calculate macroscopic quantities
		var rho = 0;
		for(var k = 0; k < 9; ++k){ rho += f[i][j][k]; }

		var u = [0, 0];
		for(var k = 0; k < 9; ++k){
			if(rho == 0){ u = [0, 0]; continue; }
			u = sum(u, mul(c*f[i][j][k]/rho, e[k]));
		}

		//draw u
		context.beginPath();
		context.moveTo((i+0.5)*dx, (j+0.5)*dx);
		context.lineTo((i+0.5)*dx+(5/dt)*u[0], (j+0.5)*dx+(5/dt)*u[1]);
		context.stroke();
	}
	}}
	//context.stroke();
}

function timestep(){

	for(var i = 0; i < steps_per_paint; ++i){
		setboundaries();
		collision();
		stream();
	}
	//paint
	setboundaries();
	render();
	
	window.requestAnimationFrame(timestep);
}
