/**
 * @class Location
 */
export default class Location {
  
  static instance = null;

  /**
  * Get literal duration from seconds.
  *
  * @param  {number} seconds Seconds.
  * @return {string}         Duration literal.
  */
  timeLiteral(seconds) {

    if (seconds === -1) 
      return "NaN";

    if (seconds < 60) 
      return `${seconds}s`;

    if (seconds <= 3599) {
      const secs = seconds % 60 << 0; 

      return `${(seconds / 60) << 0}min` + (secs > 0 ? `${secs}s` : "");
    }

    const mins = ((seconds % 3600) / 60) << 0;

    return `${(seconds / 3600) << 0}h ${mins > 0 ? `${mins}min` : ""}`;
  }

  /**
  * Get distance with postfix.
  * 
  * @param  {number} distance Distance in km.
  * @return {string} Distance with postfix.
  */
  literal(distance) {
    return `${
      distance < 1 ? Math.round(distance * 1000) : distance.toFixed(1)
    } ${distance < 1 ? "m" : "km"}`;
  }

  /**
  * The Haversine Formula
  *
  * @param  {object} point0 Object with latitude and longitude.
  * @param  {object} point1 Object with latitude and longitude.
  * @return {number}        Distance.
  */
  distance(point0, point1) {
    const p = 0.017453292519943295;

    const c = Math.cos;

    const a =
      0.5 -
      c((point1.latitude - point0.latitude) * p) / 2 +
      c(point0.latitude * p) *
      c(point1.latitude * p) *
      (1 - c((point1.longitude - point0.longitude) * p))) / 2;
    return 12742 * Math.asin(Math.sqrt(a));
  }

  static get() {
    if (Location.instance == null) {
      Location.instance = new Location();
    }

    return this.instance;
  }
}
