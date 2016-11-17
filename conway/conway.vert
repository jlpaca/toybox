precision highp float;

attribute vec2 q;

void main(){
	gl_Position = vec4(q, 0.0, 1.0);
}
