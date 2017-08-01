function integrate(q, v){
	q[0] = q[0]+v[0]*dt;
	q[1] = q[1]+v[1]*dt;
	q[2] = q[2]+v[2]*dt;
}

// LORENZ ATTRACTOR
function v_lorenz(q, v, p){
	v[0] = 0.4*(p[0]*(q[1]-q[0]));
	v[1] = 0.4*(q[0]*(p[2]-q[2])-q[1]);
	v[2] = 0.4*(q[0]*q[1]-p[1]*q[2]);
}
function lorenz(S){
	S.reset(); S.f = v_lorenz;

	// parameters
	S.parameters = [12, 8/3, 28];

	// initial conditions
	S.initq = [-20, 0, -12];
	
	S.steps_per_seg = 4;
	S.segs_per_update = 16;

	// default viewing angle for maximum prettiness
	orbitcontrols.camera_fromqspherical({
	o: [10, 2.9, 14, 1], r: 88, t: 3.8, f: 0.9});
}

// ROESSLER ATTRACTOR
function v_roessler(q, v, p){
	v[0] = 2*(-q[1]-q[2]);
	v[1] = 2*(q[0]+p[0]*q[1]);
	v[2] = 2*(p[1]+q[2]*(q[0]-p[2]));
}
function roessler(S){
	S.reset(); S.f = v_roessler;

	S.parameters = [0.2, 0.2, 5.7];

	S.initq = [-0.1, 0.5, -0.6];

	S.steps_per_seg = 4;
	S.segs_per_update = 16;

	orbitcontrols.camera_fromqspherical({
	o: [2.1, 1.2, 9, 1], r: 42, t: 4.2, f: -0.15});
}

// THOMAS
function v_thomas(q, v, p){

	v[0] = 60*(Math.sin(q[1]/6)-p[0]*q[0]/6);
	v[1] = 60*(Math.sin(q[2]/6)-p[0]*q[1]/6);
	v[2] = 60*(Math.sin(q[0]/6)-p[0]*q[2]/6);
}
function thomas(S){
	S.reset(); S.f = v_thomas;

	S.parameters = [0.2];

	S.initq = [0.1, 0, 0];

	S.steps_per_seg = 4;
	S.segs_per_update = 16;

	orbitcontrols.camera_fromqspherical({
	o: [16, 3, 8, 1], r: 60, t: 0.1, f: 0.3});
}

// CHUA CIRCUIT
function v_chua(q, v, p){
	var x = q[0]/10, y = q[1]/10, z = q[2]/10;
	var m0 = -1.143, m1 = -0.714;

	var f = m1*x+(m0-m1)/2*(Math.abs(x+1)-Math.abs(x-1));
	v[0] = 8*p[0]*(y-x-f);
	v[1] = 8*p[1]*(x-y+z);
	v[2] = -8*p[2]*y;
}
function chua(S){
	S.reset(); S.f = v_chua;

	S.parameters = [15.6, 1, 28];

	S.initq = [0.7, 0, 0];

	S.steps_per_seg = 4;
	S.segs_per_update = 16;

	orbitcontrols.camera_fromqspherical({
	o: [0, -0, 0, 1], r: 70, t: 0.89, f: -0.34 });
}

// LU-CHEN
function v_chen(q, v, p){

	v[0] = 0.5*(-p[0]*p[1]/(p[0]+p[1])*q[0]-q[1]*q[2]+p[2]);
	v[1] = 0.5*(p[0]*q[1]+q[0]*q[2]);
	v[2] = 0.5*(p[1]*q[2]+q[0]*q[1]);
}
function chen(S){
	S.reset(); S.f = v_chen;

	S.parameters = [-8.52, -4,-0.1];

	S.initq = [10, -20, -5];

	S.steps_per_seg = 4;
	S.segs_per_update = 16;

	orbitcontrols.camera_fromqspherical({
	o: [1.17, -4.41, -1.4, 1], r: 115, t: 0.36, f: -0.4 });
}

// SPROTT-LINZ
function v_sprott(q, v, p){

	v[0] = 40*(q[1]/12);
	v[1] = 40*(q[2]/12);
	v[2] = 40*(-p[0]*q[2]/12-q[1]/12+Math.abs(q[0]/12)-1);
}
function sprott(S){
	S.reset(); S.f = v_sprott;

	S.parameters = [0.6];

	S.initq = [0, 1, 0]

	S.steps_per_seg = 4;
	S.segs_per_update = 16;

	orbitcontrols.camera_fromqspherical({
	o: [1, 2, -1, 1], r: 66, t: 0.36, f: -0.4 });
}

// RABINOVICH-FABRIKANT
function v_rabinovich(q, v, p){
	var x = q[0]/16, y = q[1]/16, z = q[2]/16;
	v[0] = 80*(y*(z-1+x*x)+p[1]*x);
	v[1] = 80*(x*(3*z+1-x*x)+p[1]*y);
	v[2] = 80*(-2*z*(p[0]+x*y));
}
function rabinovich(S){
	S.reset(); S.f = v_rabinovich;

	S.parameters = [0.98, 0.1];

	//S.initq = [1, 13, 11];
	S.initq = [1, 13, 11];

	S.steps_per_seg = 4;
	S.segs_per_update = 16;

	orbitcontrols.camera_fromqspherical({
	o: [0.01, 4.34, 1.9, 1], r: 90, t: 2.6, f: 0.36 });
}

var roster = [lorenz, roessler, thomas, chua, chen, sprott, rabinovich];
var currnt = 0;

var max_segs_per_update = 72;
var max_time = 4096;
var dt = 0.002;
function Dynsys(){

	// parameters
	this.parameters = null;

	// system state
	this.initq = [0, 0, 0];
	this.q = [0, 0, 0];
	this.v = [0, 0, 0];

	this.f = null;

	this.age = 0;
	
	this.steps_per_seg = 8;
	this.segs_per_update = 12;
	this.visual_init();
	
	return this;
}
Dynsys.prototype.visual_init = function() {
	// THREE.js thingies
	var g = new THREE.BufferGeometry();
	g.addAttribute('position',
	new THREE.BufferAttribute(
		new Float32Array(max_time*max_segs_per_update*3),
		3));
	g.getAttribute('position').dynamic = true;


	g.addAttribute('color',
	new THREE.BufferAttribute(
		new Float32Array(max_time*max_segs_per_update*3),
		3));


	var m = new THREE.LineBasicMaterial({
		color: 0xffffff, linewidth: 1,
		vertexColors: THREE.VertexColors
	});

	this.mesh = new THREE.Line(g, m);
	scene.add(this.mesh);

	// default viewing angle for maximum prettiness
	this.defaultview = {
		o: [0, 0, 0, 1],
		r: 100, t: 0, f: 0};

}
Dynsys.prototype.update = function(){
	for (var j = 0; j < this.segs_per_update; ++j) {

	var qpattr = this.mesh.geometry.getAttribute('position');
	var qarray = qpattr.array;

	var cpattr = this.mesh.geometry.getAttribute('color');
	var carray = cpattr.array;

	// update location of traced particle
	for (var i = 0; i < this.steps_per_seg; ++i) {
		this.f(this.q, this.v, this.parameters);
		integrate(this.q, this.v);
	}

	// push a new vertice, position and colour.
	qarray[this.age*3  ] = this.q[0];
	qarray[this.age*3+1] = this.q[1];
	qarray[this.age*3+2] = this.q[2];


	var velo = Math.sqrt(this.v[0]*this.v[0]+
		this.v[1]*this.v[1]+this.v[2]*this.v[2]);

	carray[this.age*3  ] = 1-Math.min(0.6, velo/140);
	carray[this.age*3+1] = 1-Math.min(0.6, velo/140);
	carray[this.age*3+2] = 1-Math.min(0.6, velo/140);

	qpattr.needsUpdate = true;
	cpattr.needsUpdate = true;
	this.mesh.geometry.setDrawRange(0, this.age);

	++this.age;

	}
}
Dynsys.prototype.reset = function() {
	this.age = 0;
	this.q = [
		this.initq[0],
		this.initq[1],
		this.initq[2]];
	this.v = [0, 0, 0];
}

var renderer, camera, scene;
var origin = new THREE.Vector3(0, 0, 0);

var orbitcontrols;

var D;

function init(){
	// set up renderer, camera, and scene
	renderer = new THREE.WebGLRenderer({
		canvas: document.getElementById("world"),
		antialias: true
	});
	renderer.setClearColor(0x363636);
	//renderer.context.disable(renderer.context.DEPTH_TEST);

	camera = new THREE.PerspectiveCamera(30,
		renderer.domElement.clientHeight/
		renderer.domElement.clientWidth,
		1, 600);

	camera.up.set(0, 0, 1);
	camera.position.set(100, 100, 120);
	camera.lookAt(origin);

	scene = new THREE.Scene();

	// camera controls
	orbitcontrols = new Orbitcontrols(camera, renderer, scene);

	// system
	D = new Dynsys();
	roster[0](D); D.reset();

	// handlers
	window.addEventListener("keydown", keydownHandler);

	// start timestepping
	timestep();

}
function keydownHandler(e){
	var pupd = false;
	if (e.which == 32) { e.preventDefault();
		D.reset();
	} else if (e.which == 39) { e.preventDefault();
		next();
	} else if (e.which == 37) { e.preventDefault();
		// left arrow - last system
		prev();
	} else if (48 < e.which && e.which < 52 &&
	D.parameters[e.which-49] != undefined) {
		D.parameters[e.which-49]*= 1.02;
		pupd = true;
	} else if (e.which == 81 &&
		D.parameters[0] != undefined) {
		D.parameters[0]*= 0.96;
		pupd = true;
	} else if (e.which == 87 &&
		D.parameters[1] != undefined) {
		D.parameters[1]*= 0.96;
		pupd = true;
	} else if (e.which == 69 &&
		D.parameters[2] != undefined) {
		D.parameters[2]*= 0.96;
		pupd = true;
	}

	if (pupd) {
		console.log(D.parameters);
		D.reset();
		pupd = false;
	}
}

var t = 0;
function timestep(){
	t = t + dt;
	window.requestAnimationFrame(timestep);

	if (D.age >= max_time*D.segs_per_update) { next(); }
	D.update();

	orbitcontrols.update();


	renderer.render(scene, camera);


	
}
function next(){
	currnt = (currnt+1)%roster.length;
	roster[currnt](D); D.reset();
}
function prev(){
	currnt = (currnt+roster.length-1)%roster.length;
	roster[currnt](D); D.reset();
}

