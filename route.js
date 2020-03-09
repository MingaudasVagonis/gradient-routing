import { blendSteps } from "./color_utils.js";
import Location from "./location.js";
import Cache from './cache.js'
import axios from "axios";
import polyline from "@mapbox/polyline";

const stroke = 4; /* Polyline width */
const key = "*"; /* Mapbox API key */

/* flatMap implementation to run on environments that doensn't support it */
const concat = (x, y) => x.concat(y);

const flatMap = (f, xs) => xs.map(f).reduce(concat, []);

/**
 * @class Route
 */
export default class Route {

	static instance = null;

	/**
	 * Entry function to request a route.
	 *
	 * @param  {array} targets An array of points containing latitude and longitude.
	 * @param  {array} colors  An array of arrays containing colors between every two points.
	 * @return {object} 	    Route object with polylines, distance and duration.
	 */
	async getRoute(targets, colors) {

		if (targets.length < 2) return;

		/* Whether the client is connected to the internet */
		const connected = await internet();

		/* Get an instance of location manager */
		const manager = Location.get();

		if (connected) return this._fine(manager, targets, colors);
		return this._abstract(manager, targets, colors);
	}

	/**
	* Getting accurate route when connected to the internet.
	*
	* @param  {Location} manager Location manager instance.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @param  {array}    colors  An array of arrays containing colors between every two points.
	* @return {object} 	         Route object with polylines, distance and duration.
	*/
	async _fine(manager, targets, colors) {

		const cache = Cache.get()

		/* Checking whether the route already exists in the cache */
		const route = cache.exists(manager, targets)

		if (route) 
			return route;

		try {
			/* Copy targets */
			const copy = targets.slice();

			const downloaded = await this._download(
				copy.shift(), /* First element */
				copy.pop(), /* Last element */
				copy /* Other elements */
			);

			if (!downloaded) return;

			const result = await this._handleRes(
				downloaded,
				manager,
				colors,
				targets
			);

			/* Save result to cache */
			cache.push(targets, result)

			return result;

		} catch (err) {
			console.warn(`Fine Route Error: ${err}`);
			return;
		}
		
	}

	/**
	* Getting accurate route when theres no access to the internet.
	*
	* @param  {Location} manager Location manager instance.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @param  {array}    colors  An array of arrays containing colors between every two points.
	* @return {object} 	         Route object with polylines, distance and duration.
	*/
	async _abstract(manager, targets, colors) {

		var meters = 0;

		var points = [];

		for (var i = 0; i < targets.length - 1; i++) {

			const arr = [targets[i], targets[i + 1]];

			/* Distance between points in meters */
			meters += manager.distance(arr[0], arr[1]);

			/* Create subpoints */
			this._divideAbstract(arr, 5);

			for (var j = 0; j < arr.length - 1; j++)
				points.push({
					points: [arr[j], arr[j + 1]],
					color: blendSteps(j * 0.2, colors[i]) /* Increasing color fraction */
				});
		}

		return {
			lines: points,
			literal: manager.literal(meters),
			duration: "no internet"
		};
	}

	/**
	* Creates more points between two points.
	*
	* @param {array}  targets An array with two points containing latitude and longitude.
	* @param {number} max 	  Number of points to create.
	*/
	_divideAbstract(targets, max) {

		for (i = 0; i < targets.length - 1; i += 2)
			targets.splice(i + 1, 0, {
				latitude: (targets[i].latitude + targets[i + 1].latitude) / 2,
				longitude: (targets[i].longitude + targets[i + 1].longitude) / 2
			});

		if (targets.length !== max) 
			this._divideAbstract(targets, max);
		else targets = targets.map((e, i) => {
				/* Creating points' pairs */
				if (i < targets.length - 1) return [e, targets[i + 1]];
			});
	}

	/**
	* Processes downloaded data.
	*
	* @param  {object}   result  Downloaded data.
	* @param  {Location} manager Location manager instance.
	* @param  {array}    colors  An array of arrays containing colors between every two points.
	* @param  {array}    targets An array of points containing latitude and longitude.
	* @return {object}   		 Route object.
	*/
	_handleRes(result, manager, colors, targets) {

		/* Parsing downloaded data */
		const parsed = this._parse(result, targets);

		/* Dividing points into 5 parts and adding colors for each leg */
		const lines = flatMap(
			(e, i) => this._process(e, colors[i]),
			parsed.points
		);

		return {
			lines,
			targets: targets || [],
			literal: manager.literal(parsed.meters / 1000),
			duration: manager.timeLiteral(parsed.duration),
			meters: parsed.meters
		};
	}

	/**
	* Downloads route data.
	*
	* @param  {object} start 	 Start point containing latitude and longitude.
	* @param  {object} end   	 End point containing latitude and longitude.
	* @param  {array}  waypoints Points in between containing latitude and longitude.
	* @return {object} 			 Downloaded data.
	*/
	async _download(start, end, waypoints) {
		
		const url = await this._buildUrl(start, end, waypoints);

		const response = await axios.get(url);

		if (response.data.code === "Ok") 
			return response.data;
	}

	/**
	* Parses downloaded data object.
	*
	* @param  {object} object  Downloaded data object.
	* @param  {array}  targets An array of points containing latitude and longitude.
	* @return {object}		   Route object.
	*/
	_parse(object, targets) {

		/* Taking only the first route option */
		const route = object.routes[0];

		if (targets.length === 2)
			return {
				points: [
					/* Decoding polyline from string */
					polyline.decode(route.geometry)
						.map(pair => ({
							latitude: pair[0],
							longitude: pair[1]
						}))
				],
				meters: route.distance,
				duration: route.duration
			};

		const lines = [];

		route.legs.forEach(leg => {

			const points = [];

			leg.steps.forEach(step => {

				points.push(
					...polyline.decode(step.geometry)
						.map(pair => ({
							latitude: pair[0],
							longitude: pair[1]
						}))
				);
			});

			lines.push(points);
		});

		return {
			points: lines,
			meters: route.distance,
			duration: route.duration
		};
	}

	/**
	* Processes points and adds colors.
	*
	* @param  {array} points An array of points containing latitude and longitude.
	* @param  {array} colors An array of color pairs.
	* @return {array} 		 An array of points pairs with color.
	*/	
	_process(points, colors) {
		/* Partition size */
		const partition = Math.floor(points.length / 5);

		const lines = [];

		for (i = 0; i < points.length; i += partition)
			lines.push({
				points: points.slice(i, i + partition + 1),
				color: blendSteps((i / partition) * 0.2, colors)
			});

		/* Adding remaining points to the last partition */
		if (lines.length > 4)
			lines[4].points.push(...points.slice(partition * 5, points.length));

		return lines;
	}

	/**
	* Builds url to request.
	*
	* @param  {object} start 	 Start point containing latitude and longitude.
	* @param  {object} end   	 End point containing latitude and longitude.
	* @param  {array}  waypoints Points in between containing latitude and longitude.
	* @return {string} 			 Url.
	*/
	async _buildUrl(start, end, waypoints) {
		const driving = await getBool("driving");

		const coordinates = [start, ...waypoints, end]
			.map(i => `${i.longitude}%2C${i.latitude}`)
			.join("%3B");

		return `https://api.mapbox.com/directions/v5/mapbox/${
			driving ? "driving" : "walking"
		}/${coordinates}.json?access_token=${key}&steps=true&geometries=polyline`;
	}

	static get() {

		if (Route.instance == null) 
			Route.instance = new Route();

		return this.instance;
	}
}
