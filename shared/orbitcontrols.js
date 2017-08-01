function Orbitcontrols(camera, renderer, scene){
	
	this.camera = camera;
	this.renderer = renderer;

	this.dragstart = {};
	this.dragstart.q2d = [0, 0];
	this.dragstart.qspherical = {
		o: [0, 0, 0, 1],
		r: 2.5,
		t: 0,
		f: Math.PI/2
	}

	this.dollyrate = 0.1;

	// records whether and how mouse events affect
	// movement of camera.
	this.state = {
		rotation: false,
		translation: false
		};

	// the position of the camera in spherical coords.
	this.qspherical = {
		o: [0, 0, 0, 1],	// origin
		r: 2.5,			// radial distance
		t: -Math.PI/2,		// azimuth
		f: Math.PI/2		// elevation
	};
	this.qspherical_limits = [0, Infinity];

	// shortcuts for special views:
	// { keycode: spherical coordinates }
	this.views = {
	97:	{ o: [0, 0, 0, 1], r: 2.5, t: 0, f: 0 },
	99:	{ o: [0, 0, 0, 1], r: 2.5, t: Math.PI/2, f: 0 },
	103:	{ o: [0, 0, 0, 1], r: 2.5, t: -Math.PI/2, f: Math.PI/2 },
	};


	this.attachhandlers(camera, renderer, scene);

	return this;
}
// visual functions do nothing but are kept here for symmetry
Orbitcontrols.prototype.visual_init = function(camera, renderer, scene){}
Orbitcontrols.prototype.visual_sync = function(){}

Orbitcontrols.prototype.qspherical_clamp = function(){
	// clamp the coordinate values to prevent accidentally
	// dividing by zero elsewhere.

	while (this.qspherical.t >  2*Math.PI) { this.qspherical.t -= 2*Math.PI; }
	while (this.qspherical.t < 0) { this.qspherical.t += 2*Math.PI; }

	this.qspherical.f = Math.min(this.qspherical.f, Math.PI/2-1e-6);
	this.qspherical.f = Math.max(this.qspherical.f, 1e-6-Math.PI/2);
}

Orbitcontrols.prototype.qspherical_fromcamera = function(){
	var q = v4fromTHREEVector3(
	this.camera.position).v4sub(this.qspherical.o);

}

Orbitcontrols.prototype.camera_fromqspherical = function(newsphq){

	// if new coordinates are supplied, update the spherical
	// coordinates to agree with the new ones. If this method
	// is called w/o argument, then it just syncs the camera
	// position with the stored spherical coords.
	if (newsphq !== undefined) {
		if (newsphq.o !== undefined) { this.qspherical.o = newsphq.o; }
		if (newsphq.r !== undefined) { this.qspherical.r = newsphq.r; }
		if (newsphq.t !== undefined) { this.qspherical.t = newsphq.t; }
		if (newsphq.f !== undefined) { this.qspherical.f = newsphq.f; }
	}
	this.qspherical_clamp();

	// calculate cartesian coordinates from spherical ones
	// and assign the result to the camera position.
	var newq = [
		this.qspherical.r*Math.cos(this.qspherical.f)
			*Math.cos(this.qspherical.t),
		this.qspherical.r*Math.cos(this.qspherical.f)
			*Math.sin(this.qspherical.t),
		this.qspherical.r*Math.sin(this.qspherical.f),
		1
	].v4add(this.qspherical.o);
	this.camera.position.fromArray(newq);

	this.camera.lookAt(new THREE.Vector3().fromArray(this.qspherical.o));
	
}

Orbitcontrols.prototype.keydownhandler = function(e){
	if (this.views[e.which]) {
		this.camera_fromqspherical(this.views[e.which]);
	}
}

Orbitcontrols.prototype.mousedownhandler = function(e){
	var q2d = [
		e.clientX/e.target.clientWidth*2-1,
		-e.clientY/e.target.clientHeight*2+1];

	// if the camera is not already being moved, and the MMB is down,
	// set the state such that mouse movement moves camera.
	if ((e.which == 1) && !(this.state.translation || this.state.rotation)){
		this.dragstart.q2d = q2d;
		this.dragstart.qspherical = {
			o: this.qspherical.o, r: this.qspherical.r,
			t: this.qspherical.t, f: this.qspherical.f };

		(e.shiftKey) ?
		this.state.translation = true :
		this.state.rotation = true;
	}
}

Orbitcontrols.prototype.mousemovehandler = function(e){
	// if currently moving the camera, calculate movement accordingly
	var dq2d = [
		(e.clientX/e.target.clientWidth*2-1) - this.dragstart.q2d[0],
		(1-e.clientY/e.target.clientHeight*2) - this.dragstart.q2d[1]
	];
	var aspect = e.target.clientHeight/e.target.clientWidth;
	if (this.state.rotation) {
		this.qspherical.t = this.dragstart.qspherical.t - 4*dq2d[0];
		this.qspherical.f = this.dragstart.qspherical.f - 4*aspect*dq2d[1];
	}
	if (this.state.translation) {
		var dx = v4fromTHREEVector3(
			(new THREE.Vector3(1, 0, 0)).applyEuler(
			this.camera.rotation));
		var dy = v4fromTHREEVector3(
			(new THREE.Vector3(0, 1, 0)).applyEuler(
			this.camera.rotation));
		this.qspherical.o = v4add(this.dragstart.qspherical.o,
		v4add(
			v4mul(-this.qspherical.r*dq2d[0], dx),
			v4mul(-this.qspherical.r*aspect*dq2d[1], dy))
		);
	}
}

Orbitcontrols.prototype.mouseuphandler = function(e){
	var q2d = [
		e.clientX/e.target.clientWidth*2-1,
		-e.clientY/e.target.clientHeight*2+1];

	// there's an assumption that the mouse can't be doing more than one
	// thing at once (the mousedown handler doesn't trigger any additional
	// statechanges once there is already an active state), so everytime
	// a button is lifted it is safe to clear all states.
	this.state.translation = false;
	this.state.rotation = false;
}

Orbitcontrols.prototype.wheelhandler = function(e){
	e.preventDefault();
	this.qspherical.r = Math.min(Math.max(
		this.qspherical_limits[0],
		this.qspherical.r + e.deltaY*this.dollyrate),
		this.qspherical_limits[1]);
}

Orbitcontrols.prototype.attachhandlers = function(camera, renderer, scene){
	window.addEventListener("keydown", this.keydownhandler.bind(this));

	renderer.domElement.addEventListener(
			"mousedown", this.mousedownhandler.bind(this));
	renderer.domElement.addEventListener(
			"mousemove", this.mousemovehandler.bind(this));
	renderer.domElement.addEventListener(
			"mouseup", this.mouseuphandler.bind(this));
	renderer.domElement.addEventListener(
			"wheel", this.wheelhandler.bind(this));
}

Orbitcontrols.prototype.update = function(){
	// wrapper for things to run every render
	this.camera_fromqspherical();
}
