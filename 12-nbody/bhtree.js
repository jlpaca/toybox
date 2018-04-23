	function Mass (i, m, x, y, u, v)
	{
		/* id */
		this.i = i;

		/* mass */
		this.m = m;

		/* position components */
		this.x = x;
		this.y = y;

		/* velocity components */
		this.u = u;
		this.v = v;

		/* force components */
		this.ax = 0;
		this.ay = 0;
	}

	function BHtree (L, X, Y)
	{

		this.mass = null;

		/* centre of mass */
		this.x = 0;
		this.y = 0;

		/* size & centre of grid cell */
		this.L = L;
		this.X = X;
		this.Y = Y;

		/* subtree mass */
		this.m = 0;

		this.children = null;
	}

	BHtree.prototype.refine = function ()
	{
			if (this.mass === null) {
				return;
			}

			this.children = [
				new BHtree(this.L/2, this.X - this.L/4, this.Y - this.L/4),
				new BHtree(this.L/2, this.X - this.L/4, this.Y + this.L/4),
				new BHtree(this.L/2, this.X + this.L/4, this.Y - this.L/4),
				new BHtree(this.L/2, this.X + this.L/4, this.Y + this.L/4)
			];

			let qx = this.mass.x > this.X ? 1 : 0;
			let qy = this.mass.y > this.Y ? 1 : 0;

			this.children[2*qx + qy].insert(this.mass);
			this.mass = null;
	}

	BHtree.prototype.insert = function (mass)
	{

		this.x = (this.x*this.m + mass.x*mass.m)/(this.m + mass.m);
		this.y = (this.y*this.m + mass.y*mass.m)/(this.m + mass.m);
		this.m += mass.m;

		if (this.mass === null && this.children === null) {

			this.mass = mass;

		} else {

			if (this.children === null) {
				this.refine();
			}

			let qx = mass.x > this.X ? 1 : 0;
			let qy = mass.y > this.Y ? 1 : 0;

			let child = this.children[2*qx + qy];
			child.insert (mass);

		}
	}
