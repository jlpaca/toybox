let canvas = document.getElementById("world");
let context = canvas.getContext("2d", { alpha: false });

let S = new Simulation(canvas, context);
for (let i = 0; i < 600; ++i) {
	S.addRandomMass();
}

window.addEventListener('keydown', function (e) {
	console.log(S.steps_per_render * S.dt);
	if (e.keyCode === 38) {
		if (S.dt < 0.08) {
			S.dt *= 2;
		} else {
			S.steps_per_render = Math.min(
			8, S.steps_per_render*2);
		}
	} else if (e.keyCode === 40) {
		if (S.steps_per_render === 1) {
			S.dt = Math.max(0.02, S.dt/2);
		} else {
			S.steps_per_render /= 2;
		}
	}
});


S.timestep();
