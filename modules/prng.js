// This module is OTT in terms of specifications and is just implemented as is so that it can be used for multiple purposes
const crypto = require('crypto'); // Used to generate cryptographically random seeds
let seedBuffer = 0; // Buffer to store previous seed value

let hash = (value = null) => {
	let parsedValue = 0;
	if (value === null) {
		parsedValue = crypto.randomBytes(4); // A cryptographically random set of bytes that I believe is based loosely on time
		parsedValue = parsedValue.toString('hex'); // Converts to hex so it can be parsed as an integer value to use as a seed
		parsedValue = parseInt(parsedValue);
	} else {
		parsedValue = value;
	}
	let sha256Hash = crypto.createHash('sha256').update(JSON.stringify(parsedValue)); // Hashes using the seed
	let parsedHash = sha256Hash.digest().readUInt32BE(); // Reads output to big endian UINT to provide a better seed
	return parseInt(parsedHash);
}

let seed = (newSeed = null, saveState = true) => {
	let hashedSeed = hash(newSeed); // Hash parameter
	while (seedBuffer == hashedSeed) { // Collision avoidance by rehashing
		hashedSeed = hash(hashedSeed);
	}
	if (saveState) seedBuffer = hashedSeed; // Update seed for when the function is next called
	return hashedSeed;
}

let lcg = (value = seed()) => {
	let a = 1664525; // Multiplier from Numerical Recipes
	let c = 1013904223; // Increment from Numerical Recipes
	let m = 2 ** 32; // Modulus from Numerical Recipes
	let number = ((a * value + c) % m); // Formula: next value = (aX+c)%m
	number /= 2 ** 32; // Brings back into range of 0-1
	return number;
}

class XORShift {
	constructor(states = null) {
		this.type = 'number'; // Default to type number
		this.states = states;
		this.currInt = 0;
		this.counter = 362437; // For use when type is array
		this.seed(states); // Seed function will set type appropriately and sort out states
		this.randInt(); // Generate the first random integer
	}

	seed(states = null) {
		this.type = 'number'; // ln 56 to 59 resets instance to default config so it can be reused
		this.states = states; // For if the input is a single number or a correctly formed array
		this.currInt = 0;
		this.counter = 362437;
		this.type = 'number';
		if (states === null || (Array.isArray(states) && states.length != 5)) { // If the input is null or an array with less than 4 elements then default to type array
			this.type = 'array'; // Default to array
			this.states = [];
			for (let i = 0; i < 5; i++) {
				let value = lcg();
				value *= (10 ** (value.toString().split('.')[1].length)) // Multiplies by 10 to remove decimal point
				this.states.push(value);
			} // Use LCG to generate 5 states to use
		} else if (Array.isArray(states) && states.length == 5) this.type = 'array' // If array and has 5 elements set type to array
		else if (typeof (states) != 'number') this.states = seed(states); // Convert to hashed number so it can be treated as a number (type is already set to number)
		this.randInt();
	}

	randInt() {
		this.next(); // Generates next number
		return this.currInt; // Returns currInt which is set by next() procedure
	}

	next() {
		if (this.type == 'number') { // 16 Bit XORShift
			let x = this.states;
			x ^= x >> 12;
			x ^= x << 25;
			x ^= x >> 27; // Uses a series of XORs and Shifts to generate a number - The numbers to shift by don't matter too much but will affect how random the output is
			this.states = x; // Sets new state for next shift
			this.currInt = Math.abs((x) >> 32); // Shifts a final time before setting to the absolute value (just in case it's negative)
		} else if (this.type == 'array') { // XORWow
			let [a, b, c, d, e] = this.states; // Assigns a var to each value of the states array
			this.states = [0, a, b, c, d] // Shifts array except for first which is left blank
			e ^= e >> 2;
			e ^= e << 1;
			e ^= a ^ (a << 4); // Performs the shifts like before
			this.counter += 362437; // Increment which gets bigger each time
			this.states[0] = e; // Set the first element which was left blank
			this.currInt = Math.abs(e + this.counter); // New integer is the first element + the counter
		}
		this.currInt /= (10 ** (this.currInt.toString().length)); // Bring into range of 0 to 1

	}
}

let xorShift = (state = null) => {
	return new XORShift(state); // Creates object from class def
}

module.exports = {
	lcg,
	seed,
	xorShift
};