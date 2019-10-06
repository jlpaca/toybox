const canv = document.getElementById("world");
const gl = canv.getContext("webgl2");

if (!gl) {
    throw "error: webgl2 not supported.";
}
const ext = gl.getExtension("EXT_color_buffer_float");
if (!ext) {
    throw "error: rendering to float texture not supported.";
}


const W = 720; /* W-by-W canvas */
const M = 256; /* M^2 particles */
let N = 1e+4; /* population */

const vquad = makeShader(gl, document.getElementById("v-quad").text, gl.VERTEX_SHADER);

const fpdata = makeShader(gl, document.getElementById("f-p-data").text, gl.FRAGMENT_SHADER);
const ffdata = makeShader(gl, document.getElementById("f-f-data").text, gl.FRAGMENT_SHADER);

const vppart = makeShader(gl, document.getElementById("v-p-part").text, gl.VERTEX_SHADER);
const fppart = makeShader(gl, document.getElementById("f-p-part").text, gl.FRAGMENT_SHADER);

const fimg = makeShader(gl, document.getElementById("f-img").text, gl.FRAGMENT_SHADER);

/* quad vertices */
const x = new Float32Array([1, 1, 1, -1, -1, 1, -1, -1]);
const xbuf = makeBuffer(gl, x, gl.STATIC_DRAW);

/* vertex hashmap */
const ij = new Float32Array(2*M*M);
for (let i = 0; i < M; ++i) {
    for (let j = 0; j < M; ++j) {
	ij[2*(i*M+j)  ] = i;
	ij[2*(i*M+j)+1] = j;
    }
}
const ijbuf = makeBuffer(gl, ij, gl.STATIC_DRAW);

const uniforms = {};

/* program for timestepping the particles */
const ppdata = makeProgram(gl, vquad, fpdata);
const ppdxloc = gl.getAttribLocation(ppdata, "x");

uniforms.ppdata = ["f", "p", "t", "off", "ang", "trn"].map((name, i) => ({
    name: name,
    location: gl.getUniformLocation(ppdata, name),
    type: i < 2 ? "1i" : "1f"
}))

/* program for timestepping the field */
const pfdata = makeProgram(gl, vquad, ffdata);
const pfdxloc = gl.getAttribLocation(pfdata, "x");

uniforms.pfdata = ["f", "evap", "diff", "actn", "diam", "curs"].map((name, i) => ({
    name: name,
    location: gl.getUniformLocation(pfdata, name),
    type: i < 1 ? "1i" : (i < 5 ? "1f" : "2f")
}));

/* program for rendering particles onto field */
const pppart = makeProgram(gl, vppart, fppart);
const pppijloc = gl.getAttribLocation(pppart, "ij");
const pppfloc = gl.getUniformLocation(pppart, "f");
const pppploc = gl.getUniformLocation(pppart, "p");


/* program for pretty output */
const pimg = makeProgram(gl, vquad, fimg);
const pixloc = gl.getAttribLocation(pimg, "x");
const pifloc = gl.getUniformLocation(pimg, "f");



/* two textures / framebuffers for ping-ponging the field */
const texadata = new Uint8Array(W*W*4);
for (let i = 0; i < W; ++i) {
    for (let j = 0; j < W; ++j) {
	texadata[4*(W*i+j)  ] = 0; /* trail */
	texadata[4*(W*i+j)+1] = 0;
	texadata[4*(W*i+j)+2] = 0;
	texadata[4*(W*i+j)+3] = 0; /* cell available: 0 / 1 */
    }
}
const texa = makeTexture(gl, 0, gl.RGBA, W, W, gl.RGBA, gl.UNSIGNED_BYTE,
			 texadata, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
const fbfa = makeFramebuffer(gl, texa, 0);

const texb = makeTexture(gl, 1, gl.RGBA, W, W, gl.RGBA, gl.UNSIGNED_BYTE,
			 null, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
const fbfb = makeFramebuffer(gl, texb, 1);

/* two textures / framebuffers for ping-ponging the particle data */
const texpdata = new Float32Array(M*M*4);
for (let i = 0; i < M*M; ++i) {
    /*
    let r  = Math.sqrt(Math.random())*0.3+0.02;
    let th = Math.random()*Math.PI*2; 
    texpdata[4*i  ] = 0.5+r*Math.cos(th);
    texpdata[4*i+1] = 0.51+r*Math.sin(th);
    */
    texpdata[4*i  ] = Math.random();
    texpdata[4*i+1] = Math.random();
    texpdata[4*i+2] = Math.random();      /* direction  */
    texpdata[4*i+3] = 1;                  /* state      */
}
const texp = makeTexture(gl, 2, gl.RGBA32F, M, M, gl.RGBA, gl.FLOAT,
			 texpdata, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
const fbfp = makeFramebuffer(gl, texp, 2);

const texq = makeTexture(gl, 3, gl.RGBA32F, M, M, gl.RGBA, gl.FLOAT,
			 null, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT);
const fbfq = makeFramebuffer(gl, texq, 3);



let ping = true; /* reading from a/p, rendering to b/q */

/* system time */
const dt = 0.1;
const T = 1;

let fastforward = 2;

/* diffusion & evaporation parameters */
const fu = {
    f: 0,
    evap: 0.01,
    diff: 0.05,
    actn: 0,
    diam: 0.015,
    curs: [0.2, 0.2],
};
let pending_actn = []; /* ad-hoc solution for faster-than-timestep interactions. */

/* agent behaviour parameters */
const pu = {
    p: 2,
    f: 0,
    t: 0,
    off: Math.pow(1.9, 5)/720, // sensory offset
    ang: 0.16,  // sensory angle
    trn: 0.75,  // turn angle
};

/* interactivity */
canv.addEventListener("mousemove", (ev) => {
    fu.curs[0] = ev.offsetX/720;
    fu.curs[1] = 1-ev.offsetY/720;
});
canv.addEventListener("mousedown", (ev) => {
    if (ev.button == 0) { // LMB
	pending_actn.push(-1);
    } else {
	pending_actn.push(1);
    }
});
window.addEventListener("mouseup", (ev) => {
    pending_actn.push(0);
});
canv.addEventListener("contextmenu", (ev) => { ev.preventDefault(); });
canv.addEventListener('wheel', (ev) => {
    if (event.deltaY > 0) {
	fu.diam /= 1.8;
    } else {
	fu.diam *= 1.8;
    }
    fu.diam = Math.max(0.015*Math.pow(1.8,-1), Math.min(fu.diam, 0.015*Math.pow(1.8, 5)));
    
});


window.addEventListener("keydown", (ev) => {
    
    switch (ev.key.toUpperCase()) {
	// agent parameters

    case "A":
	pu.ang -= 0.04;
	break;
    case "S":
	pu.ang += 0.04;
	break;

    case "O":
	pu.off /= 1.9;
	break;
    case "P":
	pu.off *= 1.9;
	break;

    case "T":
	pu.trn -= 0.25;
	break;
    case "Y":
	pu.trn += 0.25;
	break;

	// environment parameters
    case "E":
	fu.evap -= 0.05;
	break;
    case "R":
	fu.evap += 0.05;
	break;
	
    case "D":
	fu.diff -= 0.06;
	break;
    case "F":
	fu.diff += 0.06;
	break;

	// environment parameters
    case "E":
	fu.evap -= 0.05;
	break;
    case "R":
	fu.evap += 0.05;
	break;
	
    case "D":
	fu.diff -= 0.06;
	break;
    case "F":
	fu.diff += 0.06;
	break;

    case "ARROWUP":
	fastforward *= 2;;
	break;

    case "ARROWDOWN":
	fastforward /= 2;
	break;

	
	
    }

    pu.ang = Math.max(0.04, Math.min(0.24, pu.ang));
    pu.off = Math.max(Math.pow(1.9, 2)/720, Math.min(Math.pow(1.9, 6)/720, pu.off));
    pu.trn = Math.max(0, Math.min(1, pu.trn));

    fu.diff = Math.max(0, Math.min(0.2, fu.diff));
    fu.evap = Math.max(0.01, Math.min(0.16, fu.evap));

    fastforward = Math.max(1, Math.min(16, fastforward));
    
    console.log(`angle = ${pu.ang}\noffset = ${pu.off*720}\nturning = ${pu.trn}`);
    console.log(`diffusion = ${fu.diff}\nevaporation = ${fu.evap}`);

});

/* main loop */
function timestep () {
    window.requestAnimationFrame(timestep);

    for (let k = 0; k < fastforward; ++k) {
	/* interactions */
	if (pending_actn.length > 0) {
	    fu.actn = pending_actn.shift();
	}
	
	/* timestep background field */
	setBuffer(gl, pfdata, pfdxloc, xbuf, 2, gl.FLOAT);

	fu.f = ping ? 0 : 1;

	uniforms.pfdata.map((u) => {
	    setUniform(gl, null, u.location, u.type, fu[u.name]);
	});

	render(gl, null, ping ? fbfb : fbfa, gl.TRIANGLE_STRIP, 0, 4);
	// render(gl, null, null, gl.TRIANGLE_STRIP, 0, 4);

	/*timestep particles */
   	setBuffer(gl, ppdata, ppdxloc, xbuf, 2, gl.FLOAT);

	pu.p = ping ? 2 : 3;
	pu.f = ping ? 0 : 1;
	pu.t = pu.t + dt - (pu.t > T ? T : 0);
	
	uniforms.ppdata.map((u) => {
	    setUniform(gl, null, u.location, u.type, pu[u.name]);
	});

	render(gl, null, ping ? fbfq : fbfp, gl.TRIANGLE_STRIP, 0, 4);
	// render(gl, null, null, gl.TRIANGLE_STRIP, 0, 4);

	/* render points */
	setBuffer(gl, pppart, pppijloc, ijbuf, 2, gl.FLOAT);
	setUniform(gl, null, pppfloc, "1i", ping ? 0 : 1);
	setUniform(gl, null, pppploc, "1i", ping ? 2 : 3);

	render(gl, null, ping ? fbfb : fbfa, gl.POINTS, 0, N);
	//render(gl, null, null, gl.POINTS, 0, M*M);

	ping = !ping;
    }
    
    /* render colour output */
    setBuffer(gl, pimg, pixloc, xbuf, 2, gl.FLOAT);
    setUniform(gl, null, pifloc, "1i", ping ? 1 : 0);
    render(gl, null, null, gl.TRIANGLE_STRIP, 0, 4);
}

timestep();
