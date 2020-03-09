

/**
* Get interpolated color by fraction between two colors.
*
* @param {number} frac   Fraction between colors.
* @param {array}  colors An array with two hex colors.
*/
const blendSteps = (frac, colors) => {

	/* Since route uses 5 points 0.4 is considered the middle */
	if(frac === 0.4)
		return blend(0.5, [blend(0.2, colors), blend(0.8, colors)])

	/* To differentiate more */
	if(frac > 0.5)
		frac += 0.2

	return blend(frac, colors)
}

/**
* Get interpolated color by fraction between two colors.
*
* @param {number} frac   Fraction between colors.
* @param {array}  colors An array with two hex colors.
*/
const blend = (frac, colors) =>{

    color0 = htc(colors[0].replace(/#/,''))
    color1 = htc(colors[1].replace(/#/,''))
   
    return cfa([0, 1, 2].map(i => Math.ceil( color0[i] * frac + color1[i] * (1-frac))))
}

/**
* Concats r g b hex representations into one.
* @param  {array} arr Array with r g b values.
* @return {string}	  Hex string.
*/
const cfa = arr => `#${toHex(lim(arr[0]))}${toHex(lim(arr[1]))}${toHex(lim(arr[2]))}`

/**
* Converts hex string to rgb array.
*
* @param  {string} color Hex string.
* @return {array} 		 Array with r g b values.
*/
const htc = color => [parseInt(color.substring(0,2), 16), parseInt(color.substring(2,4), 16), parseInt(color.substring(4,6), 16)]

/**
* Limit value between 0 and 255.
* @param  {number} color Color.
* @return {number}		 Color.
*/
const lim = color => Math.min(Math.max(color, 0), 255)

/**
* Converts integer to string.
* @param  {number} int Integer.
* @return {string}     Hex string.
*/
const toHex = int =>{
	int = int.toString(16)
    return (int.length == 1) ? `0${int}` : int
}

export {
	blend,
	toHex,
	blendSteps,
}