//SIMPLE VECTOR OPERATIONS
function sum(v, w){ return [v[0]+w[0], v[1]+w[1]]; }
function sub(v, w){ return [v[0]-w[0], v[1]-w[1]]; }
function mul(a, v){ return [v[0]*a, v[1]*a]; }

function dot(v, w){ return v[0]*w[0]+v[1]*w[1]; }
function x(v, w){ return v[0]*w[1]-v[1]*w[0]; }

function mag2(v){ return (v[0]*v[0]+v[1]*v[1]); }
function mag(v){ return Math.sqrt(v[0]*v[0]+v[1]*v[1]); }
function unit(v){ return mul(1/mag(v), v); }
function clip(l, v){ if(mag(v) > l){ v = mul(l/mag(v), v);} return v;}
