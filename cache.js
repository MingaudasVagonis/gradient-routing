const cache_margin = 0.015; /* Cache's distance limit in km */

/**
 * @class Cache
 */
class Cache {
	instance = null;

	/* Route packages with two points */
	packages = [];

	/* Route packages with three or more */
	multi_packages = [];

	/**
	* Pushes route object to cache.
	*
	* @param {array}  targets An array of points containing latitude and longitude.
	* @param {object} result  Route object to be saved.
	*/
	push(targets, result){
		if (targets.length > 2) 
			this.multi_packages.push(result);
		else this.packages.push(result);
	}

	/**
	* Checks whether the package exists.
	* 
	* @param  {Location} manager Location manager instance.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @return {object}	 		 Route package.
	*/
	exists(manager, targets) {

		return targets.length > 2
			? this._existsMultiple(manager, targets)
			: this._existsSingle(manager, targets);
	}

	/**
	* Checks whether the package exists with two targets.
	* 
	* @param  {Location} manager Location manager instance.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @return {object}	 		 Route package.
	*/
	_existsSingle(manager, targets) {

		for (i = this.packages.length - 1; i >= 0; i--) {
			const res = this._matchSingle(manager, targets, this.packages[i]);

			if (res === 0) 
				return this.packages[i];
			else if (res === 1) 
				this.packages.splice(i, 1); /* If result is 1 remove from the cache */
		}
		return null;
	}

	/**
	* Checks whether the package exists with three or more targets.
	* 
	* @param  {Location} manager Location manager instance.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @return {object}	 		 Route package.
	*/
	_existsMultiple(manager, targets) {

		for (i = this.multi_packages.length - 1; i >= 0; --i) {

			const res = this._matchMultiple(
				manager,
				targets,
				this.multi_packages[i]
			);

			if (res === 0) 
				return this.multi_packages[i];
			else if (res === 1) 
				this.multi_packages.splice(i, 1); /* If result is 1 remove from the cache */
		}

		return null;
	}

	/**
	* If packages with two points match.
	*
	* @param  {Location} manager Location manager instance.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @param  {array}	 pack 	 Array with points to match.
	* @return {number}			 Status.
	*/
	_matchSingle(manager, targets, pack) {

		/* If pack is not existant */
		if (!pack) return 2;

		/* If the difference between second coordinates is smaller than 10m */
		if (manager.distance(targets[1], pack.targets[1]) <= 0.01) {
			/* If the difference between first coordinates 
				(user) is smaller than cache_margin */
			if (manager.distance(targets[0], pack.targets[0]) <= cache_margin)
				return 0;
			else return 1; /* Else expire pack */

		} else return 1; /* Else expire pack */

		return 2;
	}

	/**
	* If packages with three or more points match.
	*
	* @param  {Location} manager Location manager instance.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @param  {array}	 pack 	 Array with points to match.
	* @return {number}			 Status.
	*/
	_matchMultiple(manager, targets, pack) {
		/* If packs length differs */
		if (!pack || targets.length !== pack.targets.length) return 2;

		/* If the difference between first coordinates 
			(user) is smaller than cache_margin */ 
		if (manager.distance(targets[0], pack.targets[0]) > cache_margin)
			return 1;

		var same = pack.targets.length > 0;

		/* If the differences between coordinates (in order) 
			are smaller than 10m */
		for (i = 1; i < pack.targets.length; i++)
			if (manager.distance(targets[i], pack.targets[i]) > 1) same = false;

		return same ? 0 : 2;
	}

	static get() {
		if (Cache.instance == null) Cache.instance = new Cache();

		return this.instance;
	}
}

export default Cache
