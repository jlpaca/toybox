precision highp float;

uniform sampler2D utex;
uniform vec3 cursor;
uniform bool RUN;

void main(){

	float TEX_DIMENSION = 512.0;

	float dx = 1.0/TEX_DIMENSION;

	vec2 texq = gl_FragCoord.xy/TEX_DIMENSION;

	int count =  int(texture2D(utex, texq+vec2( dx,   0)).x >= 0.59)
				+int(texture2D(utex, texq+vec2( dx,  dx)).x >= 0.59)
				+int(texture2D(utex, texq+vec2(  0,  dx)).x >= 0.59)
				+int(texture2D(utex, texq+vec2(-dx,  dx)).x >= 0.59)
				+int(texture2D(utex, texq+vec2(-dx,   0)).x >= 0.59)
				+int(texture2D(utex, texq+vec2(-dx, -dx)).x >= 0.59)
				+int(texture2D(utex, texq+vec2(  0, -dx)).x >= 0.59)
				+int(texture2D(utex, texq+vec2( dx, -dx)).x >= 0.59);

	bool live = texture2D(utex, texq).x >= 0.59;

	gl_FragColor = texture2D(utex, texq);

	if(RUN){
		if(live && (count < 2 || count > 3)){	//kill cell.
			gl_FragColor = vec4(0.5, 0.0, 0.25, 1.0);

		} else if (live) {						//decay live cell.
			gl_FragColor = max(gl_FragColor - vec4(0.04, 0.1, 0.08, 0.0),
											  vec4(0.6, 0.0, 0.24, 1.0));

		} else if (count == 3) {				//new cell.
			gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

		} else {								//decay dead cell.
			gl_FragColor = max(gl_FragColor - vec4(0.007, 0.0, 0.007, 0.0),
											  vec4(0.1, 0.0, 0.04, 0.0));
		}
	}

	if(length(floor(cursor.xy/2.0)-gl_FragCoord.xy) < 0.9){
		if(cursor.z > 0.5){	 gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);  }
		if(cursor.z < -0.5){ gl_FragColor = vec4(0.15, 0.0, 0.09, 1.0); }
	}

}
