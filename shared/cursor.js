var Cursor = function(elem){
	this.q = new Vector2(0, 0);
	this.elem = elem;

	this.elem.addEventListener('contextmenu', this.contextmenu.bind(this));
	this.elem.addEventListener('mousedown', this.mousedown.bind(this));
	this.elem.addEventListener('mousemove', this.mousemove.bind(this));
	this.elem.addEventListener('mouseup', this.mouseup.bind(this));
	
}
Cursor.prototype = {
	contextmenu: function(e){
		e.preventDefault();
	},
	mousedown: function(e){
		this.q.set(e.offsetX, e.offsetY);
		this.action = e.button;
	},
	mousemove: function(e){
		this.q.set(e.offsetX, e.offsetY);
	},
	mouseup: function(e){
		this.q.set(e.offsetX, e.offsetY);
		this.action = null;
	},
};

