

/**
 * Global namespace for the whole library
 * @namespace Global namespace for the whole library
 * @type {Object}
 */
var Fireworks	= {};

/**
 * enable or disable debug in the library
 * @type {Boolean}
 */
Fireworks.debug	= true;//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

Fireworks.EffectsStackBuilder	= function(emitter){
	this._emitter	= emitter;
};

/**
 * Getter for the emitter 
*/
Fireworks.EffectsStackBuilder.prototype.emitter	= function(){
	return this._emitter;	
};

Fireworks.EffectsStackBuilder.prototype.back	= function(){
	return this._emitter;
}

Fireworks.EffectsStackBuilder.prototype.createEffect	= function(name, opts){
	var creator	= Fireworks.createEffect(name, opts).pushTo(this._emitter).back(this);
	creator.effect().emitter(this._emitter);
	return creator;
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Basic Fireworks.Effect builder
*/
Fireworks.createEffect	= function(name, opts){
	// handle polymophism
	if( typeof(name) === 'object' ){
		opts	= name;
		name	= undefined;
	}
	
	var effect	= new Fireworks.Effect();
	effect.opts	= opts;
	effect.name	= name;
	effect.back	= null;
	var methods	= {
		onCreate: function(val){
			effect.onCreate	= val;
			return methods;
		},
		onBirth: function(val){
			effect.onBirth	= val;
			return methods;
		},
		onUpdate: function(val){
			effect.onUpdate	= val;
			return methods;
		},
		onDeath: function(val){
			effect.onDeath	= val;
			return methods;
		},
		onPreUpdate: function(val){
			effect.onPreUpdate	= val;
			return methods;
		},
		onPreRender: function(val){
			effect.onPreRender	= val;
			return methods;
		},
		onRender: function(val){
			effect.onRender	= val;
			return methods;
		},
		onPostRender: function(val){
			effect.onPostRender	= val;
			return methods;
		},
		onIntensityChange: function(val){
			effect.onIntensityChange= val;
			return methods;
		},
		pushTo	: function(emitter){
			emitter.effects().push(effect);
			return methods;	
		},
		back	: function(value){
			if( value === undefined )	return effect.back;	
			effect.back	= value;
			return methods;	
		},
		effect	: function(){
			return effect;
		}
	}
	return methods;
}

/**
 * An effect to apply on particles
*/
Fireworks.Effect	= function(){
	this._emitter	= null;
}

Fireworks.Effect.prototype.destroy	= function(){
}

/**
 * Getter/Setter for the emitter 
*/
Fireworks.Effect.prototype.emitter	= function(value){
	if( value === undefined )	return this._emitter;	
	this._emitter	= value;
	return this;	
};

/**
 * Callback called on particle creation
*/
//Fireworks.Effect.prototype.onCreate	= function(){
//}
//
/**
 * Callback called when a particle is spawning
 *
 * TODO to rename onSpawn
*/
//Fireworks.Effect.prototype.onBirth	= function(){
//}
//
//Fireworks.Effect.prototype.onDeath	= function(){
//}
//
//Fireworks.Effect.prototype.onUpdate	= function(){
//}

Fireworks.createEmitter	= function(opts){
	return new Fireworks.Emitter(opts);
}

/**
 * The emitter of particles
*/
Fireworks.Emitter	= function(opts){
	this._nParticles	= opts.nParticles !== undefined ? opts.nParticles : 100;
	this._particles		= [];
	this._effects		= [];
	this._started		= false;
	this._onUpdated		= null;
	this._intensity		= 0;
	this._maxDeltaTime	= 1/3;

	this._effectsStackBuilder	= new Fireworks.EffectsStackBuilder(this)
}

Fireworks.Emitter.prototype.destroy	= function()
{
	this._effects.forEach(function(effect){
		effect.destroy();
	});
	this._particles.forEach(function(particle){
		particle.destroy();
	});
}


//////////////////////////////////////////////////////////////////////////////////
//		Getters								//
//////////////////////////////////////////////////////////////////////////////////

Fireworks.Emitter.prototype.effects	= function(){
	return this._effects;
}
Fireworks.Emitter.prototype.effect	= function(name){
	for(var i = 0; i < this._effects.length; i++){
		var effect	= this._effects[i];
		if( effect.name === name )	return effect;
	}
	return null;
}

Fireworks.Emitter.prototype.particles	= function(){
	return this._particles;
}
Fireworks.Emitter.prototype.liveParticles	= function(){
	return this._liveParticles;
}
Fireworks.Emitter.prototype.deadParticles	= function(){
	return this._deadParticles;
}
Fireworks.Emitter.prototype.nParticles	= function(){
	return this._nParticles;
}

Fireworks.Emitter.prototype.effectsStackBuilder	= function(){
	return this._effectsStackBuilder;
}


/**
 * Getter/setter for intensity
*/
Fireworks.Emitter.prototype.intensity	= function(value){
	// if it is a getter, return value
	if( value === undefined )	return this._intensity;
	// if the value didnt change, return for chained api
	if( value === this._intensity )	return this;
	// sanity check
	Fireworks.debug && console.assert( value >= 0, 'Fireworks.Emitter.intensity: invalid value.', value);
	Fireworks.debug && console.assert( value <= 1, 'Fireworks.Emitter.intensity: invalid value.', value);
	// backup the old value
	var oldValue	= this._intensity;
	// update the value
	this._intensity	= value;
	// notify all effects
	this._effects.forEach(function(effect){
		if( !effect.onIntensityChange )	return;
		effect.onIntensityChange(this._intensity, oldValue);			
	}.bind(this));
	return this;	// for chained API
}

/**
 * Getter/setter for intensity
*/
Fireworks.Emitter.prototype.maxDeltaTime	= function(value){
	if( value === undefined )	return this._maxDeltaTime;
	this._maxDeltaTime	= value;
	return this;
}

//////////////////////////////////////////////////////////////////////////////////
//		backward compatibility						//
//////////////////////////////////////////////////////////////////////////////////

Fireworks.Emitter.prototype.setParticleData	= function(particle, namespace, value){
	particle[namespace] = value;
}

Fireworks.Emitter.prototype.getParticleData	= function(particle, namespace){
	return particle[namespace];
}

//////////////////////////////////////////////////////////////////////////////////
//		Start function							//
//////////////////////////////////////////////////////////////////////////////////

Fireworks.Emitter.prototype.start	= function()
{
	console.assert( this._effects.length > 0, "At least one effect MUST be set")
	console.assert( this._started === false );
	
	this._particles		= new Array(this._nParticles);
	for(var i = 0; i < this._nParticles; i++){
		this._particles[i]	= new Fireworks.Particle();
	}

	this._liveParticles	= [];
	this._deadParticles	= this._particles.slice(0);
	this._started		= true;

	// onCreate on all particles
	this._effects.forEach(function(effect){
		if( !effect.onCreate )	return;
		this._particles.forEach(function(particle, particleIdx){
			effect.onCreate(particle, particleIdx);			
		})
	}.bind(this));
	// set the intensity to 1
	this.intensity(1)

	return this;	// for chained API
}

Fireworks.Emitter.prototype.update	= function(deltaTime){
	// bound the deltaTime to this._maxDeltaTime
	deltaTime	= Math.min(this._maxDeltaTime, deltaTime)
	// honor effect.onPreUpdate
	this._effects.forEach(function(effect){
		if( !effect.onPreUpdate )	return;
		effect.onPreUpdate(deltaTime);			
	}.bind(this));
	// update each particles
	this._effects.forEach(function(effect){
		if( !effect.onUpdate )	return;
		this._liveParticles.forEach(function(particle){
			effect.onUpdate(particle, deltaTime);			
		})
	}.bind(this));
	return this;	// for chained API
}

Fireworks.Emitter.prototype.render	= function(){
	this._effects.forEach(function(effect){
		if( !effect.onPreRender )	return;
		effect.onPreRender();			
	}.bind(this));
	this._effects.forEach(function(effect){
		if( !effect.onRender )	return;
		this._liveParticles.forEach(function(particle){
			effect.onRender(particle);			
		})
	}.bind(this));
	this._effects.forEach(function(effect){
		if( !effect.onPostRender )	return;
		effect.onPostRender();			
	}.bind(this));
	return this;	// for chained API
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * kill this particle
*/
Fireworks.Emitter.prototype.killParticle	= function(particle)
{
	var idx	= this._liveParticles.indexOf(particle);
	// sanity check
	Fireworks.debug && console.assert( idx !== -1 );
	this._liveParticles.splice(idx, 1)
	this._deadParticles.push(particle);
	// do the death on all effects
	this.effects().forEach(function(effect){
		effect.onDeath && effect.onDeath(particle);			
	}.bind(this));
}

/**
 * Spawn a particle
*/
Fireworks.Emitter.prototype.spawnParticle	= function(){
	// sanity check
	Fireworks.debug && console.assert(this._deadParticles.length >= 1, 'no more particle available' );
	// change the particles 
	var particle	= this.deadParticles().pop();
	this.liveParticles().push(particle);
	// do the birth on all effects
	this.effects().forEach(function(effect){
		effect.onBirth && effect.onBirth(particle);			
	}.bind(this));
}
Fireworks.createLinearGradient	= function(opts){
	var LinearGradient	= new Fireworks.LinearGradient(opts);
	return LinearGradient;
}

/**
 * The emitter of particles
*/
Fireworks.LinearGradient	= function(opts){
	this._keyPoints	= [];
}

Fireworks.LinearGradient.prototype.push	= function(x, y){
	this._keyPoints.push({
		x	: x,
		y	: y
	});
	return this;
}

/**
 * Compute a value for this LinearGradient
*/
Fireworks.LinearGradient.prototype.get	= function(x){
	for( var i = 0; i < this._keyPoints.length; i++ ){
		var keyPoint	= this._keyPoints[i];
		if( x <= keyPoint.x )	break;
	}

	if( i === 0 )	return this._keyPoints[0].y;

	// sanity check
	Fireworks.debug && console.assert(i < this._keyPoints.length );

	var prev	= this._keyPoints[i-1];
	var next	= this._keyPoints[i];
	
	var ratio	= (x - prev.x) / (next.x - prev.x)
	var y		= prev.y + ratio * (next.y - prev.y)
	
	return y;
};
/**
 * The emitter of particles
*/
Fireworks.Particle	= function(){
}

Fireworks.Particle.prototype.set	= function(key, value){
	// sanity check
	Fireworks.debug && console.assert( this[key] === undefined, "key already defined: "+key );
	
	this[key]	= value;
	return this[key];
}

Fireworks.Particle.prototype.get	= function(key){
	Fireworks.debug && console.assert( this[key] !== undefined, "key undefined: "+key );
	return this[key];
}

Fireworks.Particle.prototype.has	= function(key){
	return this[key] !== undefined	? true : false;
}
Fireworks.Shape	= function(){
}

///**
// * @param {Fireworks.Vector} point the point coordinate to test
// * @returns {Boolean} true if point is inside the shape, false otherwise
//*/
//Fireworks.Shape.prototype.contains	= function(point){
//}
//
///**
// * generate a random point contained in this shape
// * @returns {Fireworks.Vector} the just generated random point
//*/
//Firefly.Shape.prototype.randomPoint	= function(vector){
//}
Fireworks.createVector = function(x, y, z){
	return new Fireworks.Vector(x,y,z);
};

/**
 * jme- copy of THREE.Vector3 https://github.com/mrdoob/three.js/blob/master/src/core/Vector3.js
 *
 * @author mr.doob / http://mrdoob.com/
 * @author kile / http://kile.stravaganza.org/
 * @author philogb / http://blog.thejit.org/
 * @author mikael emtinger / http://gomo.se/
 * @author egraether / http://egraether.com/
 */

Fireworks.Vector = function ( x, y, z ) {

	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;

};


Fireworks.Vector.prototype = {

	constructor: Fireworks.Vector,

	set: function ( x, y, z ) {

		this.x = x;
		this.y = y;
		this.z = z;

		return this;

	},

	setX: function ( x ) {

		this.x = x;

		return this;

	},

	setY: function ( y ) {

		this.y = y;

		return this;

	},

	setZ: function ( z ) {

		this.z = z;

		return this;

	},
	
	random	: function( ) {
		this.x	= Math.random() - 0.5;
		this.y	= Math.random() - 0.5;
		this.z	= Math.random() - 0.5;
		return this;
	}, // jme - added
	
	toString	: function(){
		return JSON.stringify(this);
	}, // jme - added

	copy: function ( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;

		return this;

	},

	add: function ( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;

		return this;

	},

	addSelf: function ( v ) {

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;

		return this;

	},

	addScalar: function ( s ) {

		this.x += s;
		this.y += s;
		this.z += s;

		return this;

	},

	sub: function ( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;

		return this;

	},

	subSelf: function ( v ) {

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;

		return this;

	},

	multiply: function ( a, b ) {

		this.x = a.x * b.x;
		this.y = a.y * b.y;
		this.z = a.z * b.z;

		return this;

	},

	multiplySelf: function ( v ) {

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;

		return this;

	},

	multiplyScalar: function ( s ) {

		this.x *= s;
		this.y *= s;
		this.z *= s;

		return this;

	},

	divideSelf: function ( v ) {

		this.x /= v.x;
		this.y /= v.y;
		this.z /= v.z;

		return this;

	},

	divideScalar: function ( s ) {

		if ( s ) {

			this.x /= s;
			this.y /= s;
			this.z /= s;

		} else {

			this.x = 0;
			this.y = 0;
			this.z = 0;

		}

		return this;

	},


	negate: function() {

		return this.multiplyScalar( - 1 );

	},

	dot: function ( v ) {

		return this.x * v.x + this.y * v.y + this.z * v.z;

	},

	lengthSq: function () {

		return this.x * this.x + this.y * this.y + this.z * this.z;

	},

	length: function () {

		return Math.sqrt( this.lengthSq() );

	},

	normalize: function () {

		return this.divideScalar( this.length() );

	},

	setLength: function ( l ) {

		return this.normalize().multiplyScalar( l );

	},
	
	cross: function ( a, b ) {

		this.x = a.y * b.z - a.z * b.y;
		this.y = a.z * b.x - a.x * b.z;
		this.z = a.x * b.y - a.y * b.x;

		return this;

	},

	crossSelf: function ( v ) {

		var x = this.x, y = this.y, z = this.z;

		this.x = y * v.z - z * v.y;
		this.y = z * v.x - x * v.z;
		this.z = x * v.y - y * v.x;

		return this;

	},

	distanceTo: function ( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	},

	distanceToSquared: function ( v ) {

		return new Fireworks.Vector().sub( this, v ).lengthSq();

	},

	equals: function ( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) );

	},

	isZero: function () {

		return ( this.lengthSq() < 0.0001 /* almostZero */ );

	},

	clone: function () {

		return new Fireworks.Vector( this.x, this.y, this.z );

	}

};
/**
 * Shortcut to create Fireworks.EffectRandomDriftVelocity
*/
Fireworks.EffectsStackBuilder.prototype.acceleration	= function(opts)
{
	opts		= opts		|| {};
	var effectId	= opts.effectId	|| 'acceleration';
	console.assert( opts.shape instanceof Fireworks.Shape );
	// create the effect itself
	Fireworks.createEffect(effectId, {
		shape	: opts.shape
	}).onCreate(function(particle){
		particle.acceleration = {
			vector	: new Fireworks.Vector()
		};
	}).onBirth(function(particle){
		var acceleration= particle.acceleration.vector;
		this.opts.shape.randomPoint(acceleration)
	}).onUpdate(function(particle, deltaTime){
		var velocity	= particle.velocity.vector;
		var acceleration= particle.acceleration.vector;
		velocity.x	+= acceleration.x * deltaTime;
		velocity.y	+= acceleration.y * deltaTime;
		velocity.z	+= acceleration.z * deltaTime;
	}).pushTo(this._emitter);

	return this;	// for chained API
};
/**
 * Handle the friction - aka a value between 0 and 1 which multiply the velocity
 *
 * @param {Number} value the friction number between 0 and 1
*/
Fireworks.EffectsStackBuilder.prototype.friction = function(value)
{
	// handle parameter polymorphism
	value = value !== undefined ? value : 1;
	// sanity check
	console.assert( value >= 0 && value <= 1.0 );
	// create the effect itself
	Fireworks.createEffect('friction')
	.onCreate(function(particle, particleIdx){
		particle.friction = {
			value: value
		};
	})
	.onBirth(function(particle){
		var data = particle.friction;
		data.value = value
	})
	.onUpdate(function(particle){
		var friction = particle.friction.value;
		var velocity = particle.velocity.vector;
		velocity.multiplyScalar(friction);
	})
	.pushTo(this._emitter);
	// return this for chained API
	return this;
};
/**
 * Shortcut to create Fireworks.EffectRandomDriftVelocity
*/
Fireworks.EffectsStackBuilder.prototype.lifeTime = function(minAge, maxAge)
{
	// sanity check
	console.assert( minAge !== undefined )
	// if maxAge isnt 
	if( maxAge === undefined )	maxAge	= minAge;
	console.assert( maxAge !== undefined )
	// create the effect itself
	var emitter	= this._emitter;
	Fireworks.createEffect('lifeTime', {
		minAge	: minAge,
		maxAge	: maxAge
	}).onCreate(function(particle){
		var data	= particle.lifeTime = {
			curAge	: 0,
			minAge	: 0,
			maxAge	: 0,
			normalizedAge	: function(){
				return (data.curAge - data.minAge) / (data.maxAge - data.minAge);
			}
		};
	}).onBirth(function(particle){
		var lifeTime	= particle.lifeTime;
		lifeTime.curAge	= 0;
		lifeTime.maxAge	= this.opts.minAge + Math.random() * (this.opts.maxAge - this.opts.minAge);
	}).onUpdate(function(particle, deltaTime){
		var lifeTime	= particle.lifeTime;
		lifeTime.curAge	+= deltaTime;
		if( lifeTime.curAge > lifeTime.maxAge )	emitter.killParticle(particle);
	}).pushTo(this._emitter);
	// return this for chained API
	return this;
};
/**
 * Shortcut to create Fireworks.EffectRandomDriftVelocity
*/
Fireworks.EffectsStackBuilder.prototype.position = function(shape)
{
	console.assert( shape instanceof Fireworks.Shape );
	Fireworks.createEffect('position', {
		shape: shape
	}).onCreate(function(particle){
		particle.position = {
			vector: new Fireworks.Vector()
		};
	}).onBirth(function(particle){
		var position = particle.position.vector;
		this.opts.shape.randomPoint(position)
	}).pushTo(this._emitter);
	return this; // for chained API
};
/**
 * Shortcut to create Fireworks.EffectRandomDriftVelocity
*/
Fireworks.EffectsStackBuilder.prototype.radialVelocity = function(minSpeed, maxSpeed)
{
	Fireworks.createEffect('radialVelocity', {
		minSpeed: minSpeed,
		maxSpeed: maxSpeed
	}).onCreate(function(particle){
		particle.velocity = {
			vector: new Fireworks.Vector()
		};
	}).onBirth(function(particle, deltaTime){
		var position = particle.position.vector;
		var velocity = particle.velocity.vector;
		var length = this.opts.minSpeed + (this.opts.maxSpeed - this.opts.minSpeed) * Math.random();
		velocity.copy(position).setLength(length);
	}).onUpdate(function(particle, deltaTime){
		var position = particle.position.vector;
		var velocity = particle.velocity.vector;
		position.x += velocity.x * deltaTime;
		position.y += velocity.y * deltaTime;
		position.z += velocity.z * deltaTime;
	}).pushTo(this._emitter);

	return this; // for chained API
};
/**
 * Shortcut to create Fireworks.EffectRandomDriftVelocity
*/
Fireworks.EffectsStackBuilder.prototype.randomVelocityDrift	= function(drift)
{
	// create the effect itself
	Fireworks.createEffect('randomVelocityDrift', {
		drift	: drift
	}).onUpdate(function(particle, deltaTime){
		var velocity	= particle.velocity.vector;
		velocity.x	+= (Math.random()*2 - 1) * this.opts.drift.x * deltaTime;
		velocity.y	+= (Math.random()*2 - 1) * this.opts.drift.y * deltaTime;
		velocity.z	+= (Math.random()*2 - 1) * this.opts.drift.z * deltaTime;
	}).pushTo(this._emitter);
	// return for chained API
	return this;	// for chained API
};
/**
 * Create a velocity effect
 * @param {Fireworks.Shape}	shape	set the direction of the velocity by a randompoint in this shape
 * @param {Number?}		speed	set the speed itself. if undefined, keep randompoint length for speed
*/
Fireworks.EffectsStackBuilder.prototype.velocity	= function(shape, speed)
{
	Fireworks.createEffect('velocity', {
		shape	: shape, 
		speed	: speed !== undefined ? speed : -1
	}).onCreate(function(particle){
		particle.velocity = {
			vector	: new Fireworks.Vector()
		};
	}).onBirth(function(particle){
		var velocity	= particle.velocity.vector;
		this.opts.shape.randomPoint(velocity)
		if( this.opts.speed !== -1 )	velocity.setLength(this.opts.speed);
	}).onUpdate(function(particle, deltaTime){
		var position	= particle.position.vector;
		var velocity	= particle.velocity.vector;
		position.x	+= velocity.x * deltaTime;
		position.y	+= velocity.y * deltaTime;
		position.z	+= velocity.z * deltaTime;
	}).pushTo(this._emitter);

	return this;	// for chained API
};
/**
 * Shortcut to create Fireworks.Shape.Box
*/
Fireworks.createShapeBox	= function(positionX, positionY, positionZ, sizeX, sizeY, sizeZ){
	var position	= new Fireworks.Vector(positionX, positionY, positionZ);
	var size	= new Fireworks.Vector(sizeX, sizeY, sizeZ);
	return new Fireworks.Shape.Box(position, size);
};

/**
 * Handle a Firework.Shape forming a sphere
 *
 * @param {Fireworks.Vector} position the position of the sphape
 * @param {Fireworks.Vector} shape the size of the shape
*/
Fireworks.Shape.Box	= function(position, size)
{
	this.position	= position;
	this.size	= size;
	this._vector	= new Fireworks.Vector();
}

// inherit from Fireworks.Effect
Fireworks.Shape.Box.prototype = new Fireworks.Shape();
Fireworks.Shape.Box.prototype.constructor = Fireworks.Shape.Box;

Fireworks.Shape.Box.prototype.contains	= function(point){
	// compute delta between the point and the position
	var delta	= this._vector.sub(point, this.position);
	// test the delta is too far
	if( Math.abs(delta.x) > this.size.x/2 )	return false;
	if( Math.abs(delta.y) > this.size.y/2 )	return false;
	if( Math.abs(delta.z) > this.size.z/2 )	return false;
	// if all tests, passed true
	return true;
}

Fireworks.Shape.Box.prototype.randomPoint	= function(vector){
	var point	= vector	|| this._vector;
	// get a random point
	point.x	= Math.random() * this.size.x - this.size.x/2;
	point.y	= Math.random() * this.size.y - this.size.y/2;
	point.z	= Math.random() * this.size.z - this.size.z/2;
	// add this.position
	point.addSelf(this.position);
	// return the point
	return point;
}
/**
 * Shortcut to create Fireworks.Shape.Point
*/
Fireworks.createShapePoint	= function(positionX, positionY, positionZ){
	var position	= new Fireworks.Vector(positionX, positionY, positionZ);
	return new Fireworks.Shape.Point(position);
};

/**
 * Handle a Firework.Shape forming a point
 *
 * @param {Fireworks.Vector} position the position of the point
*/
Fireworks.Shape.Point	= function(position)
{
	this.position	= position;
	this._vector	= new Fireworks.Vector();
}

// inherit from Fireworks.Effect
Fireworks.Shape.Point.prototype = new Fireworks.Shape();
Fireworks.Shape.Point.prototype.constructor = Fireworks.Shape.Point;

Fireworks.Shape.Point.prototype.contains	= function(point){
	if( point.x !== this.position.x )	return false;
	if( point.y !== this.position.y )	return false;
	if( point.z !== this.position.z )	return false;
	// if all tests, passed true
	return true;
}

Fireworks.Shape.Point.prototype.randomPoint	= function(vector){
	var point	= vector	|| this._vector;
	// get a random point
	point.copy(this.position);
	// return the point
	return point;
}
/**
 * Shortcut to create Fireworks.Shape.Box
*/
Fireworks.createShapeSphere	= function(positionX, positionY, positionZ, radius, boundingbox){
	var position	= new Fireworks.Vector(positionX, positionY, positionZ);
	return new Fireworks.ShapeSphere(position, radius);
};


/**
 * Handle a Firework.Shape forming a sphere
 *
 * @param {Fireworks.Vector} position the position of the sphere
 * @param {Number} radius the radius of the sphere
*/
Fireworks.ShapeSphere	= function(position, radius)
{
	this.position	= position;
	this.radius	= radius;
	this._vector	= new Fireworks.Vector();
}

// inherit from Fireworks.Effect
Fireworks.ShapeSphere.prototype = new Fireworks.Shape();
Fireworks.ShapeSphere.prototype.constructor = Fireworks.ShapeSphere;

Fireworks.ShapeSphere.prototype.contains	= function(point){
	// compute distance between the point and the position
	var distance	= this._vector.sub(point, this.position).length();
	// return true if this distance is <= than sphere radius
	return distance <= this.radius;
}

Fireworks.ShapeSphere.prototype.randomPoint	= function(vector){
	var point	= vector	|| this._vector;
	// get a random point
	point.x	= Math.random()-0.5;
	point.y	= Math.random()-0.5;
	point.z	= Math.random()-0.5;
	// compute the length between the point 
	var length	= Math.random()*this.radius;
	// set the point at the proper distance;
	point.setLength( length );
	// add the position
	point.addSelf(this.position);
	// return the point
	return point;
}
/**
 * Spawner deliverying paricles in one shot
 * 
 * @param {Number?} the number of particle to emit
*/
Fireworks.EffectsStackBuilder.prototype.spawnerOneShot	= function(nParticles)
{
	// handle parameter polymorphism
	nParticles	= nParticles	|| this.emitter().nParticles();
	// define local variables
	var emitter	= this.emitter();
	var nSent	= 0;
	var spawning	= true;

	// create the effect itself
	Fireworks.createEffect('spawner', {
		reset	: function(){ nSent	= 0;	},
		start	: function(){ spawning	= true;	},
		stop	: function(){ spawning	= false;}
	}).onPreUpdate(function(deltaTime){
		// if spawning is false, do nothing
		if( spawning === false )	return;
		// if already completed, do nothing
		if( nParticles === nSent )	return;
		// spawn each particle
		var amount	= nParticles - nSent;
		amount		= Math.min(amount, emitter.deadParticles().length);
		for(var i = 0; i < amount; i++){
			emitter.spawnParticle();
		}
		// update the amount of sent particles
		nSent	+= amount;
	}).pushTo(this._emitter);
	// return this for chained API
	return this;
};
/**
 * Spawner deliverying paricles at a steady rate
 * 
 * @param {Number?} rate the rate at which it gonna emit
*/
Fireworks.EffectsStackBuilder.prototype.spawnerSteadyRate	= function(rate)
{
	// handle parameter polymorphism
	rate	= rate !== undefined ? rate	: 1;
	// define local variables
	var emitter	= this.emitter();
	var nToCreate	= 1;
	var spawning	= true;
	
	// create the effect itself
	Fireworks.createEffect('spawner', {
		rate	: rate,
		start	: function(){ spawning = true;	},
		stop	: function(){ spawning = false;	}
	}).onPreUpdate(function(deltaTime){
		var rate	= this.opts.rate;
		// if spawning is false, do nothing
		if( spawning === false )	return;
		// update nToCreate
		nToCreate	+= rate * deltaTime;
		// nParticles is the interger part of nToCreate as you spawn them one by one
		var nParticles	= Math.floor(nToCreate);
		// dont spawn more particles than available
		// TODO here estimate how much more is needed to never lack of it
		nParticles	= Math.min(nParticles, emitter.deadParticles().length);
		// update nToCreate
		nToCreate	-= nParticles;
		// spawn each particle
		for(var i = 0; i < nParticles; i++){
			emitter.spawnParticle();
		}
	}).pushTo(this._emitter);
	// return this for chained API
	return this;
};
/**
 * render to canvas
*/
Fireworks.EffectsStackBuilder.prototype.renderToCanvas	= function(opts)
{
	opts	= opts		|| {};
	var ctx	= opts.ctx	|| buildDefaultContext();
	// create the effect itself
	var effect	= Fireworks.createEffect('renderToCanvas', {
		ctx	: ctx
	}).pushTo(this._emitter);


	if( opts.type === 'arc' )		ctorTypeArc(effect);
	else if( opts.type === 'drawImage' )	ctorTypeDrawImage(effect);
	else{
		console.assert(false, 'renderToCanvas opts.type is invalid: ');
	}

	return this;	// for chained API
	

	function buildDefaultContext(){
		// build canvas element
		var canvas	= document.createElement('canvas');
		canvas.width	= window.innerWidth;
		canvas.height	= window.innerHeight;
		document.body.appendChild(canvas);
		// canvas.style
		canvas.style.position	= "absolute";
		canvas.style.left	= 0;
		canvas.style.top	= 0;
		// setup ctx
		var ctx		= canvas.getContext('2d');
		// return ctx
		return ctx;
	}

	function ctorTypeArc(){
		return effect.onCreate(function(particle, particleIdx){
			particle.renderToCanvas = {
				size	: 3
			};
		}).onRender(function(particle){
			var position	= particle.position.vector;
			var size	= particle.renderToCanvas.size;

			ctx.beginPath();
			ctx.arc(position.x + canvas.width /2, 
				position.y + canvas.height/2, size, 0, Math.PI*2, true); 
			ctx.fill();					
		});
	};
	function ctorTypeDrawImage(){
		// handle parameter polymorphism
		if( typeof(opts.image) === 'string' ){
			var images	= [new Image];
			images[0].src	= opts.image;
		}else if( opts.image instanceof Image ){
			var images	= [opts.image];
		}else if( opts.image instanceof Array ){
			var images	= opts.image;
		}else	console.assert(false, 'invalid .renderToCanvas() options')

		return effect.onCreate(function(particle, particleIdx){
			particle.renderToCanvas = {
				scale		: 1,	// should that be there ? or in its own effect ?
				opacity		: 1,	// should that be there ? or in its own effect ?
				rotation	: 0*Math.PI
			};
		}).onRender(function(particle){
			var position	= particle.position.vector;
			var data	= particle.renderToCanvas;
			var canonAge	= particle.lifeTime.normalizedAge();
			var imageIdx	= Math.floor(canonAge * images.length);
			var image	= images[imageIdx];
			// save the context
			ctx.save();
			// translate in canvas's center, and the particle position
			ctx.translate(position.x + canvas.width/2, position.y + canvas.height/2);
			// set the scale of this particles
			ctx.scale(data.scale, data.scale);
			// set the rotation
			ctx.rotate(data.rotation);
			// set ctx.globalAlpha
			ctx.globalAlpha	= data.opacity; 
			// draw the image itself
			if( image instanceof Image ){
				ctx.drawImage(image, -image.width/2, -image.height/2);			
			}else if( typeof(image) === 'object' ){
				ctx.drawImage(image.image
				 	,  image.offsetX,  image.offsetY , image.width, image.height
					, -image.width/2, -image.height/2, image.width, image.height);
			}else	console.assert(false);
			// restore the context
			ctx.restore();
		});
	};
};
/**
 * render to three.js THREE.Object3D
 * If i play with object3D.visible true/false instead of Object3D.add/remove
 * i got a lot of artefacts
*/
Fireworks.EffectsStackBuilder.prototype.renderToThreejsObject3D	= function(opts)
{
	var effectId	= opts.effectId	|| 'renderToThreeParticleSystem';
	var container	= opts.container;


	// create the effect itself
	Fireworks.createEffect(effectId)
	.onCreate(function(particle, particleIdx){
		particle.threejsObject3D = {
			object3d	: opts.create()
		};
		Fireworks.debug && console.assert(particle.threejsObject3D.object3d instanceof THREE.Object3D);
		
		var object3d	= particle.threejsObject3D.object3d;

//		object3d.visible= false;
	}).onBirth(function(particle){
		var object3d	= particle.threejsObject3D.object3d;
//		object3d.visible= true;
		container.add(object3d);
	}).onDeath(function(particle){
		var object3d	= particle.threejsObject3D.object3d;
//		object3d.visible= false;
		container.remove(object3d);
	}).onRender(function(particle){
		var object3d	= particle.threejsObject3D.object3d;
		var position	= particle.position.vector;
		object3d.position.set(position.x, position.y, position.z);
	}).pushTo(this._emitter);
	return this;	// for chained API
};
/**
 * render to three.js to THREE.ParticleSystem
*/
Fireworks.EffectsStackBuilder.prototype.renderToThreejsParticleSystem	= function(opts)
{
	opts			= opts			|| {};
	var effectId		= opts.effectId		|| 'renderToThreejsParticleSystem';
	var particleSystem	= opts.particleSystem	|| defaultParticleSystem;
	// if opts.particleSystem is a function, call it to create the particleSystem
	if( typeof(particleSystem) === 'function' )	particleSystem	= particleSystem(this._emitter);
	// sanity check
	console.assert(particleSystem instanceof THREE.ParticleSystem, "particleSystem MUST be THREE.ParticleSystem");
	// some aliases
	var geometry	= particleSystem.geometry;
	console.assert(geometry.vertices.length >= this._emitter.nParticles())
	// create the effect itself
	Fireworks.createEffect(effectId, {
		particleSystem	: particleSystem
	}).onCreate(function(particle, particleIdx){
		particle.threejsParticle = {
			particleIdx	: particleIdx
		};
		var vertex	= geometry.vertices[particleIdx];
		vertex.set(Infinity, Infinity, Infinity);
	}).onDeath(function(particle){
		var particleIdx	= particle.threejsParticle.particleIdx;
		var vertex	= geometry.vertices[particleIdx];
		vertex.set(Infinity, Infinity, Infinity);
	}).onRender(function(particle){
		var particleIdx	= particle.threejsParticle.particleIdx;
		var vertex	= geometry.vertices[particleIdx];
		var position	= particle.position.vector;
		vertex.set(position.x, position.y, position.z);
	}).pushTo(this._emitter);
	return this;	// for chained API

	//////////////////////////////////////////////////////////////////////////
	//		Internal Functions					//
	//////////////////////////////////////////////////////////////////////////

	function defaultParticleSystem(emitter){
		var geometry	= new THREE.Geometry();
		for( var i = 0; i < emitter.nParticles(); i++ ){
			geometry.vertices.push( new THREE.Vector3() );
		}
		var material	= new THREE.ParticleBasicMaterial({
			size		: 5,
			sizeAttenuation	: true,
			color		: 0xE01B6A,
			map		: generateTexture(),
			blending	: THREE.AdditiveBlending,
			depthWrite	: false,
			transparent	: true
		});
		var particleSystem		= new THREE.ParticleSystem(geometry, material);
		particleSystem.dynamic		= true;
		particleSystem.sortParticles	= true;
		return particleSystem;
	}

	function generateTexture(size){
		size		= size || 128;
		var canvas	= document.createElement( 'canvas' );
		var context	= canvas.getContext( '2d' );
		canvas.width	= canvas.height	= size;

		var gradient	= context.createRadialGradient( canvas.width/2, canvas.height /2, 0, canvas.width /2, canvas.height /2, canvas.width /2 );		
		gradient.addColorStop( 0  , 'rgba(255,255,255,1)' );
		gradient.addColorStop( 0.5, 'rgba(255,255,255,1)' );
		gradient.addColorStop( 0.7, 'rgba(128,128,128,1)' );
		gradient.addColorStop( 1  , 'rgba(0,0,0,1)' );

		context.beginPath();
		context.arc(size/2, size/2, size/2, 0, Math.PI*2, false);
		context.closePath();

		context.fillStyle	= gradient;
		//context.fillStyle	= 'rgba(128,128,128,1)';
		context.fill();

		var texture	= new THREE.Texture( canvas );
		texture.needsUpdate = true;

		return texture;
	}
};

Fireworks.Emitter.prototype.bindTriggerDomEvents	= function(domElement){
	var tmp	= new Fireworks.BindTriggerDomEvents(this, domElement);
	return this;	// for chained API
}

Fireworks.BindTriggerDomEvents	= function(emitter, domElement){
	this._domElement= domElement	|| document.body;

	// bind mouse event
	this._onMouseDown	= function(){ emitter.effect('spawner').opts.start();	};
	this._onMouseUp		= function(){ emitter.effect('spawner').opts.stop();	};
	this._domElement.addEventListener('mousedown'	, this._onMouseDown	);
	this._domElement.addEventListener('mouseup'	, this._onMouseUp	);

	// change emitter intensity on mousewheel		
	this._onMouseWheel	= function(event){
		var intensity	= emitter.intensity();
		intensity	+= event.wheelDelta < 0 ? -0.05 : 0.05;
		intensity	= Math.max(intensity, 0);
		intensity	= Math.min(intensity, 1);
		emitter.intensity(intensity);
	};
	this._domElement.addEventListener('mousewheel'	, this._onMouseWheel	);
}


Fireworks.BindTriggerDomEvents.prototype.destroy	= function(){
	this._domElement.removeEventListener('mousedown'	, this._onMouseDown	);
	this._domElement.removeEventListener('mouseup'		, this._onMouseUp	);
	this._domElement.removeEventListener('mousewheel'	, this._onMouseWheel	);
};
Fireworks.DatGui4Emitter	= function(emitter){
	var gui		= new dat.GUI();
	var effects	= emitter.effects();
	effects.forEach(function(effect, idx){
		var effectName	= effect.name	|| "effect-"+idx;
		var opts	= effect.opts	|| {};
		var keys	= Object.keys(opts).filter(function(key){
			if( opts[key] instanceof Fireworks.Vector )	return true;
			if( typeof(opts[key]) === 'object' )		return false;
			return true;
		});
		if( keys.length ){
			var folder	= gui.addFolder('Effect: '+effectName);
			keys.forEach(function(key){
				if( opts[key] instanceof Fireworks.Vector ){
					folder.add(opts[key], 'x').name(key+"X");
					folder.add(opts[key], 'y').name(key+"Y");
					folder.add(opts[key], 'z').name(key+"Z");
				}else{
					folder.add(opts, key);
				}
			});
		}
	});
	// return the built gui
	return gui;
};Fireworks.ProceduralTextures	= {};

Fireworks.ProceduralTextures.buildTexture	= function(size)
{
	size		= size || 150;
	var canvas	= document.createElement( 'canvas' );
	var context	= canvas.getContext( '2d' );
	canvas.width	= canvas.height	= size;

	var gradient	= context.createRadialGradient( canvas.width/2, canvas.height /2, 0, canvas.width /2, canvas.height /2, canvas.width /2 );		
	gradient.addColorStop( 0  , 'rgba(255,255,255,1)' );
	gradient.addColorStop( 0.5, 'rgba(255,255,255,1)' );
	gradient.addColorStop( 0.7, 'rgba(128,128,128,1)' );
	gradient.addColorStop( 1  , 'rgba(0,0,0,1)' );

	context.beginPath();
	context.arc(size/2, size/2, size/2, 0, Math.PI*2, false);
	context.closePath();

	context.fillStyle	= gradient;
	//context.fillStyle	= 'rgba(128,128,128,1)';
	context.fill();

	var texture	= new THREE.Texture( canvas );
	texture.needsUpdate = true;

	return texture;
}


/**
 * @author alteredq / http://alteredqualia.com/
 * @author mr.doob / http://mrdoob.com/
 */

var Detector = {

	canvas: !! window.CanvasRenderingContext2D,
	webgl: ( function () { try { return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); } catch( e ) { return false; } } )(),
	workers: !! window.Worker,
	fileapi: window.File && window.FileReader && window.FileList && window.Blob,

	getWebGLErrorMessage: function () {

		var element = document.createElement( 'div' );
		element.id = 'webgl-error-message';
		element.style.fontFamily = 'monospace';
		element.style.fontSize = '13px';
		element.style.fontWeight = 'normal';
		element.style.textAlign = 'center';
		element.style.background = '#fff';
		element.style.color = '#000';
		element.style.padding = '1.5em';
		element.style.width = '400px';
		element.style.margin = '5em auto 0';

		if ( ! this.webgl ) {

			element.innerHTML = window.WebGLRenderingContext ? [
				'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />',
				'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'
			].join( '\n' ) : [
				'Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>',
				'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'
			].join( '\n' );

		}

		return element;

	},

	addGetWebGLMessage: function ( parameters ) {

		var parent, id, element;

		parameters = parameters || {};

		parent = parameters.parent !== undefined ? parameters.parent : document.body;
		id = parameters.id !== undefined ? parameters.id : 'oldie';

		element = Detector.getWebGLErrorMessage();
		element.id = id;

		parent.appendChild( element );

	}

};

// This THREEx helper makes it easy to handle window resize.
// It will update renderer and camera when window is resized.
//
// # Usage
//
// **Step 1**: Start updating renderer and camera
//
// ```var windowResize = new THREEx.WindowResize(aRenderer, aCamera)```
//    
// **Step 2**: stop updating renderer and camera
//
// ```windowResize.destroy()```
// # Code

//

/** @namespace */
var THREEx	= THREEx || {}

/**
 * Update renderer and camera when the window is resized
 * 
 * @param {Object} renderer the renderer to update
 * @param {Object} Camera the camera to update
*/
THREEx.WindowResize	= function(renderer, camera){
	var callback	= function(){
		// notify the renderer of the size change
		renderer.setSize( window.innerWidth, window.innerHeight )
		// update the camera
		camera.aspect	= window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
	}
	// bind the resize event
	window.addEventListener('resize', callback, false)
	// return .stop() the function to stop watching window resize
	return {
		trigger	: function(){
			callback()
		},
		/**
		 * Stop watching window resize
		*/
		destroy	: function(){
			window.removeEventListener('resize', callback)
		}
	}
}

// stats.js - http://github.com/mrdoob/stats.js
var Stats=function(){var l=Date.now(),m=l,g=0,n=Infinity,o=0,h=0,p=Infinity,q=0,r=0,s=0,f=document.createElement("div");f.id="stats";f.addEventListener("mousedown",function(b){b.preventDefault();t(++s%2)},!1);f.style.cssText="width:80px;opacity:0.9;cursor:pointer";var a=document.createElement("div");a.id="fps";a.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002";f.appendChild(a);var i=document.createElement("div");i.id="fpsText";i.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";
i.innerHTML="FPS";a.appendChild(i);var c=document.createElement("div");c.id="fpsGraph";c.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff";for(a.appendChild(c);74>c.children.length;){var j=document.createElement("span");j.style.cssText="width:1px;height:30px;float:left;background-color:#113";c.appendChild(j)}var d=document.createElement("div");d.id="ms";d.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none";f.appendChild(d);var k=document.createElement("div");
k.id="msText";k.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";k.innerHTML="MS";d.appendChild(k);var e=document.createElement("div");e.id="msGraph";e.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0";for(d.appendChild(e);74>e.children.length;)j=document.createElement("span"),j.style.cssText="width:1px;height:30px;float:left;background-color:#131",e.appendChild(j);var t=function(b){s=b;switch(s){case 0:a.style.display=
"block";d.style.display="none";break;case 1:a.style.display="none",d.style.display="block"}};return{REVISION:11,domElement:f,setMode:t,begin:function(){l=Date.now()},end:function(){var b=Date.now();g=b-l;n=Math.min(n,g);o=Math.max(o,g);k.textContent=g+" MS ("+n+"-"+o+")";var a=Math.min(30,30-30*(g/200));e.appendChild(e.firstChild).style.height=a+"px";r++;b>m+1E3&&(h=Math.round(1E3*r/(b-m)),p=Math.min(p,h),q=Math.max(q,h),i.textContent=h+" FPS ("+p+"-"+q+")",a=Math.min(30,30-30*(h/100)),c.appendChild(c.firstChild).style.height=
a+"px",m=b,r=0);return b},update:function(){l=this.end()}}};


/**
 * Tutorials:
 * http://www.html5rocks.com/en/tutorials/webaudio/games/
 * http://www.html5rocks.com/en/tutorials/webaudio/positional_audio/ <- +1 as it is three.js
 * http://www.html5rocks.com/en/tutorials/webaudio/intro/
 *
 * Spec:
 * https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html
 *
 * Chromium Demo:
 * http://chromium.googlecode.com/svn/trunk/samples/audio/index.html  <- running page
 * http://code.google.com/p/chromium/source/browse/trunk/samples/audio/ <- source
*/


/**
 * Notes on removing tQuery dependancy
 * * some stuff depends on tQuery
 * * find which one
 * * tQuery.Webaudio got a world link for the listener
 *   * do a plugin with followListener(world), unfollowListener(world)
 * * namespace become WebAudio.* instead of WebAudio.*
*/

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//		WebAudio							//
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////


window.AudioContext	= window.AudioContext || window.webkitAudioContext;

/**
 * Main class to handle webkit audio
 * 
 * TODO make the clip detector from http://www.html5rocks.com/en/tutorials/webaudio/games/
 *
 * @class Handle webkit audio API
 *
 * @param {tQuery.World} [world] the world on which to run 
*/
WebAudio	= function(){
	// sanity check - the api MUST be available
	if( WebAudio.isAvailable === false ){
		this._addRequiredMessage();
		// Throw an error to stop execution
		throw new Error('WebAudio API is required and not available.')	
	}
	
	// create the context
	this._ctx	= new AudioContext();
	// setup internal variable
	this._muted	= false;
	this._volume	= 1;

	// setup the end of the node chain
	// TODO later code the clipping detection from http://www.html5rocks.com/en/tutorials/webaudio/games/ 
	this._gainNode	= this._ctx.createGain();
	this._compressor= this._ctx.createDynamicsCompressor();
	this._gainNode.connect( this._compressor );
	this._compressor.connect( this._ctx.destination );	

	// init page visibility
	this._pageVisibilityCtor();	
};


/**
 * vendor.js way to make plugins ala jQuery
 * @namespace
*/
WebAudio.fn	= WebAudio.prototype;


/**
 * destructor
*/
WebAudio.prototype.destroy	= function(){
	this._pageVisibilityDtor();
};

/**
 * @return {Boolean} true if it is available or not
*/
WebAudio.isAvailable	= window.AudioContext ? true : false;

//////////////////////////////////////////////////////////////////////////////////
//		comment								//
//////////////////////////////////////////////////////////////////////////////////

WebAudio.prototype._addRequiredMessage = function(parent) {
	// handle defaults arguements
	parent	= parent || document.body;
	// message directly taken from Detector.js
	var domElement = document.createElement( 'div' );
	domElement.style.fontFamily	= 'monospace';
	domElement.style.fontSize	= '13px';
	domElement.style.textAlign	= 'center';
	domElement.style.background	= '#eee';
	domElement.style.color		= '#000';
	domElement.style.padding	= '1em';
	domElement.style.width		= '475px';
	domElement.style.margin		= '5em auto 0';
	domElement.innerHTML		= [
		'Your browser does not seem to support <a href="https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html">WebAudio API</a>.<br />',
		'Try with <a href="https://www.google.com/intl/en/chrome/browser/">Chrome Browser</a>.'
	].join( '\n' );
	// add it to the parent
	parent.appendChild(domElement);
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * get the audio context
 *
 * @returns {AudioContext} the audio context
*/
WebAudio.prototype.context	= function(){
	return this._ctx;
};

/**
 * Create a sound
 *
 * @returns {WebAudio.Sound} the sound just created
*/
WebAudio.prototype.createSound	= function()
{
	var webaudio	= this;
	var sound	= new WebAudio.Sound(webaudio);
	return sound;
}


/**
 * return the entry node in the master node chains
*/
WebAudio.prototype._entryNode	= function(){
	//return this._ctx.destination;
	return this._gainNode;
}

//////////////////////////////////////////////////////////////////////////////////
//		volume/mute							//
//////////////////////////////////////////////////////////////////////////////////

/**
 * getter/setter on the volume
*/
WebAudio.prototype.volume	= function(value){
	if( value === undefined )	return this._volume;
	// update volume
	this._volume	= value;
	// update actual volume IIF not muted
	if( this._muted  === false ){
		this._gainNode.gain.value	= this._volume;	
	}
	// return this for chained API
	return this;
};

/** 
 * getter/setter for mute
*/
WebAudio.prototype.mute	= function(value){
	if( value === undefined )	return this._muted;
	this._muted	= value;
	this._gainNode.gain.value	= this._muted ? 0 : this._volume;
	return this;	// for chained API
}

/**
 * to toggle the mute
*/
WebAudio.prototype.toggleMute	= function(){
	if( this.mute() )	this.mute(false);
	else			this.mute(true);
}

//////////////////////////////////////////////////////////////////////////////////
//		pageVisibility							//
//////////////////////////////////////////////////////////////////////////////////


WebAudio.prototype._pageVisibilityCtor	= function(){
	// shim to handle browser vendor
	this._pageVisibilityEventStr	= (document.hidden !== undefined	? 'visibilitychange'	:
		(document.mozHidden	!== undefined		? 'mozvisibilitychange'	:
		(document.msHidden	!== undefined		? 'msvisibilitychange'	:
		(document.webkitHidden	!== undefined		? 'webkitvisibilitychange' :
		console.assert(false, "Page Visibility API unsupported")
	))));
	this._pageVisibilityDocumentStr	= (document.hidden !== undefined ? 'hidden' :
		(document.mozHidden	!== undefined ? 'mozHidden' :
		(document.msHidden	!== undefined ? 'msHidden' :
		(document.webkitHidden	!== undefined ? 'webkitHidden' :
		console.assert(false, "Page Visibility API unsupported")
	))));
	// event handler for visibilitychange event
	this._$pageVisibilityCallback	= function(){
		var isHidden	= document[this._pageVisibilityDocumentStr] ? true : false;
		this.mute( isHidden ? true : false );
	}.bind(this);
	// bind the event itself
	document.addEventListener(this._pageVisibilityEventStr, this._$pageVisibilityCallback, false);
}

WebAudio.prototype._pageVisibilityDtor	= function(){
	// unbind the event itself
	document.removeEventListener(this._pageVisibilityEventStr, this._$pageVisibilityCallback, false);
}
/**
 * Constructor
 *
 * @class builder to generate nodes chains. Used in WebAudio.Sound
 * @param {AudioContext} audioContext the audio context
*/
WebAudio.NodeChainBuilder	= function(audioContext){
	console.assert(audioContext instanceof AudioContext);
	this._context	= audioContext;
	this._firstNode	= null;
	this._lastNode	= null;
	this._nodes	= {};
};

/**
 * creator
 * 
 * @param  {webkitAudioContext} 	audioContext the context	
 * @return {WebAudio.NodeChainBuider}	just created object
 */
WebAudio.NodeChainBuilder.create= function(audioContext){
	return new WebAudio.NodeChainBuilder(audioContext);
}

/**
 * destructor
*/
WebAudio.NodeChainBuilder.prototype.destroy	= function(){
};

//////////////////////////////////////////////////////////////////////////////////
//		getters								//
//////////////////////////////////////////////////////////////////////////////////

/**
 * getter for the nodes
*/
WebAudio.NodeChainBuilder.prototype.nodes	= function(){
	return this._nodes;
}

/**
 * @returns the first node of the chain
*/
WebAudio.NodeChainBuilder.prototype.first	= function(){
	return this._firstNode;
}

/**
 * @returns the last node of the chain
*/
WebAudio.NodeChainBuilder.prototype.last	= function(){
	return this._lastNode;
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * add a node to the chain
 * @param {[type]} node       [description]
 * @param {[type]} properties [description]
 */
WebAudio.NodeChainBuilder.prototype._addNode	= function(node, properties)
{
	// update this._bufferSourceDst - needed for .cloneBufferSource()
	var lastIsBufferSource	= this._lastNode && ('playbackRate' in this._lastNode) ? true : false;
	if( lastIsBufferSource )	this._bufferSourceDst	= node;

	// connect this._lastNode to node if suitable
	if( this._lastNode !== null )	this._lastNode.connect(node);
	
	// update this._firstNode && this._lastNode
	if( this._firstNode === null )	this._firstNode	= node;
	this._lastNode	= node;
		
	// apply properties to the node
	for( var property in properties ){
		node[property]	= properties[property];
	}

	// for chained API
	return this;
};


//////////////////////////////////////////////////////////////////////////////////
//		creator for each type of nodes					//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Clone the bufferSource. Used just before playing a sound
 * @returns {AudioBufferSourceNode} the clone AudioBufferSourceNode
*/
WebAudio.NodeChainBuilder.prototype.cloneBufferSource	= function(){
	console.assert(this._nodes.bufferSource, "no buffersource presents. Add one.");
	var orig	= this._nodes.bufferSource;
	var clone	= this._context.createBufferSource()
	clone.buffer		= orig.buffer;
	clone.playbackRate	= orig.playbackRate;
	clone.loop		= orig.loop;
	clone.connect(this._bufferSourceDst);
	return clone;
}

/**
 * add a bufferSource
 *
 * @param {Object} [properties] properties to set in the created node
*/
WebAudio.NodeChainBuilder.prototype.bufferSource	= function(properties){
	var node		= this._context.createBufferSource()
	this._nodes.bufferSource= node;
	return this._addNode(node, properties)
};

/**
 * add a createMediaStreamSource
 *
 * @param {Object} [properties] properties to set in the created node
*/
WebAudio.NodeChainBuilder.prototype.mediaStreamSource	= function(stream, properties){
//	console.assert( stream instanceof LocalMediaStream )
	var node		= this._context.createMediaStreamSource(stream)
	this._nodes.bufferSource= node;
	return this._addNode(node, properties)
};

/**
 * add a createMediaElementSource
 * @param  {HTMLElement} element    the element to add
 * @param {Object} [properties] properties to set in the created node
 */
WebAudio.NodeChainBuilder.prototype.mediaElementSource = function(element, properties){
	console.assert(element instanceof HTMLAudioElement || element instanceof HTMLVideoElement)
	var node		= this._context.createMediaElementSource(element)
	this._nodes.bufferSource= node;
	return this._addNode(node, properties)
};

/**
 * add a panner
 * 
 * @param {Object} [properties] properties to set in the created node
*/
WebAudio.NodeChainBuilder.prototype.panner	= function(properties){
	var node		= this._context.createPanner()
	this._nodes.panner	= node;
	return this._addNode(node, properties)
};

/**
 * add a analyser
 *
 * @param {Object} [properties] properties to set in the created node
*/
WebAudio.NodeChainBuilder.prototype.analyser	= function(properties){
	var node		= this._context.createAnalyser()
	this._nodes.analyser	= node;
	return this._addNode(node, properties)
};

/**
 * add a gainNode
 *
 * @param {Object} [properties] properties to set in the created node
*/
WebAudio.NodeChainBuilder.prototype.gainNode	= function(properties){
	var node		= this._context.createGain()
	this._nodes.gainNode	= node;
	return this._addNode(node, properties)
};

/**
 * sound instance
 *
 * @class Handle one sound for WebAudio
 *
 * @param {tQuery.World} [world] the world on which to run
 * @param {WebAudio.NodeChainBuilder} [nodeChain] the nodeChain to use
*/
WebAudio.Sound	= function(webaudio, nodeChain){
	this._webaudio	= webaudio;
	this._context	= this._webaudio.context();

	console.assert( this._webaudio instanceof WebAudio );

	// create a default NodeChainBuilder if needed
	if( nodeChain === undefined ){
		nodeChain	= new WebAudio.NodeChainBuilder(this._context)
					.bufferSource().gainNode().analyser().panner();
	}
	// setup this._chain
	console.assert( nodeChain instanceof WebAudio.NodeChainBuilder );
	this._chain	= nodeChain;
	// connect this._chain.last() node to this._webaudio._entryNode()
	this._chain.last().connect( this._webaudio._entryNode() );
	
	// create some alias
	this._source	= this._chain.nodes().bufferSource;
	this._gainNode	= this._chain.nodes().gainNode;
	this._analyser	= this._chain.nodes().analyser;
	this._panner	= this._chain.nodes().panner;
	
	// sanity check
	console.assert(this._source	, "no bufferSource: not yet supported")
	console.assert(this._gainNode	, "no gainNode: not yet supported")
	console.assert(this._analyser	, "no analyser: not yet supported")
	console.assert(this._panner	, "no panner: not yet supported")
};

WebAudio.Sound.create	= function(webaudio, nodeChain){
	return new WebAudio.Sound(webaudio,  nodeChain);
}

/**
 * destructor
*/
WebAudio.Sound.prototype.destroy	= function(){
	// disconnect from this._webaudio
	this._chain.last().disconnect();
	// destroy this._chain
	this._chain.destroy();
	this._chain	= null;
};

/**
 * vendor.js way to make plugins ala jQuery
 * @namespace
*/
WebAudio.Sound.fn	= WebAudio.Sound.prototype;

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * getter of the chain nodes
*/
WebAudio.Sound.prototype.nodes	= function(){
	return this._chain.nodes();
};

/**
 * @returns {Boolean} true if the sound is playable, false otherwise
*/
WebAudio.Sound.prototype.isPlayable	= function(){
	return this._source.buffer ? true : false;
};

/**
 * play the sound
 *
 * @param {Number} [time] time when to play the sound
*/
WebAudio.Sound.prototype.play		= function(time){
	// handle parameter polymorphism
	if( time ===  undefined )	time	= 0;
	// if not yet playable, ignore
	// - usefull when the sound download isnt yet completed
	if( this.isPlayable() === false )	return;
	// clone the bufferSource
	var clonedNode	= this._chain.cloneBufferSource();
	// set the noteOn
	clonedNode.start(time);
	// create the source object
	var source	= {
		node	: clonedNode,
		stop	: function(time){
			if( time ===  undefined )	time	= 0;
			this.node.stop(time);
			return source;	// for chained API
		}
	}
	// return it
	return source;
};

/**
 * getter/setter on the volume
 *
 * @param {Number} [value] the value to set, if not provided, get current value
*/
WebAudio.Sound.prototype.volume	= function(value){
	if( value === undefined )	return this._gainNode.gain.value;
	this._gainNode.gain.value	= value;
	return this;	// for chained API
};


/**
 * getter/setter on the loop
 * 
 * @param {Number} [value] the value to set, if not provided, get current value
*/
WebAudio.Sound.prototype.loop	= function(value){
	if( value === undefined )	return this._source.loop;
	this._source.loop	= value;
	return this;	// for chained API
};

/**
 * getter/setter on the source buffer
 * 
 * @param {Number} [value] the value to set, if not provided, get current value
*/
WebAudio.Sound.prototype.buffer	= function(value){
	if( value === undefined )	return this._source.buffer;
	this._source.buffer	= value;
	return this;	// for chained API
};


/**
 * Set parameter for the pannerCone
 *
 * @param {Number} innerAngle the inner cone hangle in radian
 * @param {Number} outerAngle the outer cone hangle in radian
 * @param {Number} outerGain the gain to apply when in the outerCone
*/
WebAudio.Sound.prototype.pannerCone	= function(innerAngle, outerAngle, outerGain)
{
	this._panner.coneInnerAngle	= innerAngle * 180 / Math.PI;
	this._panner.coneOuterAngle	= outerAngle * 180 / Math.PI;
	this._panner.coneOuterGain	= outerGain;
	return this;	// for chained API
};

/**
 * getter/setter on the pannerConeInnerAngle
 * 
 * @param {Number} value the angle in radian
*/
WebAudio.Sound.prototype.pannerConeInnerAngle	= function(value){
	if( value === undefined )	return this._panner.coneInnerAngle / 180 * Math.PI;
	this._panner.coneInnerAngle	= value * 180 / Math.PI;
	return this;	// for chained API
};

/**
 * getter/setter on the pannerConeOuterAngle
 *
 * @param {Number} value the angle in radian
*/
WebAudio.Sound.prototype.pannerConeOuterAngle	= function(value){
	if( value === undefined )	return this._panner.coneOuterAngle / 180 * Math.PI;
	this._panner.coneOuterAngle	= value * 180 / Math.PI;
	return this;	// for chained API
};

/**
 * getter/setter on the pannerConeOuterGain
 * 
 * @param {Number} value the value
*/
WebAudio.Sound.prototype.pannerConeOuterGain	= function(value){
	if( value === undefined )	return this._panner.coneOuterGain;
	this._panner.coneOuterGain	= value;
	return this;	// for chained API
};

/**
 * compute the amplitude of the sound (not sure at all it is the proper term)
 *
 * @param {Number} width the number of frequencyBin to take into account
 * @returns {Number} return the amplitude of the sound
*/
WebAudio.Sound.prototype.amplitude	= function(width)
{
	// handle paramerter
	width		= width !== undefined ? width : 2;
	// inint variable
	var analyser	= this._analyser;
	var freqByte	= new Uint8Array(analyser.frequencyBinCount);
	// get the frequency data
	analyser.getByteFrequencyData(freqByte);
	// compute the sum
	var sum	= 0;
	for(var i = 0; i < width; i++){
		sum	+= freqByte[i];
	}
	// complute the amplitude
	var amplitude	= sum / (width*256-1);
	// return ampliture
	return amplitude;
}

/**
 * Generate a sinusoid buffer.
 * FIXME should likely be in a plugin
*/
WebAudio.Sound.prototype.tone	= function(hertz, seconds){
	// handle parameter
	hertz	= hertz !== undefined ? hertz : 200;
	seconds	= seconds !== undefined ? seconds : 1;
	// set default value	
	var nChannels	= 1;
	var sampleRate	= 44100;
	var amplitude	= 2;
	// create the buffer
	var buffer	= this._webaudio.context().createBuffer(nChannels, seconds*sampleRate, sampleRate);
	var fArray	= buffer.getChannelData(0);
	// fill the buffer
	for(var i = 0; i < fArray.length; i++){
		var time	= i / buffer.sampleRate;
		var angle	= hertz * time * Math.PI;
		fArray[i]	= Math.sin(angle)*amplitude;
	}
	// set the buffer
	this.buffer(buffer);
	return this;	// for chained API
}


/**
 * Put this function is .Sound with getByt as private callback
*/
WebAudio.Sound.prototype.makeHistogram	= function(nBar)
{	
	// get analyser node
	var analyser	= this._analyser;
	// allocate the private histo if needed - to avoid allocating at every frame
	//this._privHisto	= this._privHisto || new Float32Array(analyser.frequencyBinCount);
	this._privHisto	= this._privHisto || new Uint8Array(analyser.frequencyBinCount);
	// just an alias
	var freqData	= this._privHisto;

	// get the data
	//analyser.getFloatFrequencyData(freqData);
	analyser.getByteFrequencyData(freqData);
	//analyser.getByteTimeDomainData(freqData);

	/**
	 * This should be in imageprocessing.js almost
	*/
	var makeHisto	= function(srcArr, dstLength){
		var barW	= Math.floor(srcArr.length / dstLength);
		var nBar	= Math.floor(srcArr.length / barW);
		var arr		= []
		for(var x = 0, arrIdx = 0; x < srcArr.length; arrIdx++){
			var sum	= 0;
			for(var i = 0; i < barW; i++, x++){
				sum += srcArr[x];
			}
			var average	= sum/barW;
			arr[arrIdx]	= average;
		}
		return arr;
	}
	// build the histo
	var histo	= makeHisto(freqData, nBar);
	// return it
	return histo;
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Load a sound
 *
 * @param {String} url the url of the sound to load
 * @param {Function} onSuccess function to notify once the url is loaded (optional)
 * @param {Function} onError function to notify if an error occurs (optional)
*/
WebAudio.Sound.prototype.load = function(url, onSuccess, onError){
	// handle default arguments
	onError	= onError	|| function(){
		console.warn("unable to load sound "+url);
	}
	// try to load the user	
	this._loadAndDecodeSound(url, function(buffer){
		this._source.buffer	= buffer;
		onSuccess && onSuccess(this);
	}.bind(this), function(){
		onError && onError(this);
	}.bind(this));
	return this;	// for chained API
};

/**
 * Load and decode a sound
 *
 * @param {String} url the url where to get the sound
 * @param {Function} onLoad the function called when the sound is loaded and decoded (optional)
 * @param {Function} onError the function called when an error occured (optional)
*/
WebAudio.Sound.prototype._loadAndDecodeSound	= function(url, onLoad, onError){
	var context	= this._context;
	var request	= new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType	= 'arraybuffer';
	// Decode asynchronously
	request.onload	= function() {
		context.decodeAudioData(request.response, function(buffer) {
			onLoad && onLoad(buffer);
		}, function(){
			onError && onError();
		});
	};
	// actually start the request
	request.send();
}
/**
 * gowiththeflow.js - a javascript flow control micro library
 * https://github.com/jeromeetienne/gowiththeflow.js
*/
WebAudio.Flow	= function(){
	var self, stack = [], timerId = setTimeout(function(){ timerId = null; self._next(); }, 0);
	return self = {
		destroy : function(){ timerId && clearTimeout(timerId); },
		par	: function(callback, isSeq){
			if(isSeq || !(stack[stack.length-1] instanceof Array)) stack.push([]);
			stack[stack.length-1].push(callback);
			return self;
		},seq	: function(callback){ return self.par(callback, true);	},
		_next	: function(err, result){
			var errors = [], results = [], callbacks = stack.shift() || [], nbReturn = callbacks.length, isSeq = nbReturn == 1;
			for(var i = 0; i < callbacks.length; i++){
				(function(fct, index){
					fct(function(error, result){
						errors[index]	= error;
						results[index]	= result;		
						if(--nbReturn == 0)	self._next(isSeq?errors[0]:errors, isSeq?results[0]:results)
					}, err, result)
				})(callbacks[i], i);
			}
		}
	}
};

// This THREEx helper makes it easy to handle the fullscreen API
// * it hides the prefix for each browser
// * it hides the little discrepencies of the various vendor API
// * at the time of this writing (nov 2011) it is available in 
//   [firefox nightly](http://blog.pearce.org.nz/2011/11/firefoxs-html-full-screen-api-enabled.html),
//   [webkit nightly](http://peter.sh/2011/01/javascript-full-screen-api-navigation-timing-and-repeating-css-gradients/) and
//   [chrome stable](http://updates.html5rocks.com/2011/10/Let-Your-Content-Do-the-Talking-Fullscreen-API).

// 
// # Code

//

/** @namespace */
var THREEx		= THREEx 		|| {};
THREEx.FullScreen	= THREEx.FullScreen	|| {};

/**
 * test if it is possible to have fullscreen
 * 
 * @returns {Boolean} true if fullscreen API is available, false otherwise
*/
THREEx.FullScreen.available	= function()
{
	return this._hasWebkitFullScreen || this._hasMozFullScreen;
}

/**
 * test if fullscreen is currently activated
 * 
 * @returns {Boolean} true if fullscreen is currently activated, false otherwise
*/
THREEx.FullScreen.activated	= function()
{
	if( this._hasWebkitFullScreen ){
		return document.webkitIsFullScreen;
	}else if( this._hasMozFullScreen ){
		return document.mozFullScreen;
	}else{
		console.assert(false);
	}
}

/**
 * Request fullscreen on a given element
 * @param {DomElement} element to make fullscreen. optional. default to document.body
*/
THREEx.FullScreen.request	= function(element)
{
	element	= element	|| document.body;
	if( this._hasWebkitFullScreen ){
		element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
	}else if( this._hasMozFullScreen ){
		element.mozRequestFullScreen();
	}else{
		console.assert(false);
	}
}

/**
 * Cancel fullscreen
*/
THREEx.FullScreen.cancel	= function()
{
	if( this._hasWebkitFullScreen ){
		document.webkitCancelFullScreen();
	}else if( this._hasMozFullScreen ){
		document.mozCancelFullScreen();
	}else{
		console.assert(false);
	}
}


// internal functions to know which fullscreen API implementation is available
THREEx.FullScreen._hasWebkitFullScreen	= 'webkitCancelFullScreen' in document	? true : false;	
THREEx.FullScreen._hasMozFullScreen	= 'mozCancelFullScreen' in document	? true : false;	

/**
 * Bind a key to renderer screenshot
*/
THREEx.FullScreen.bindKey	= function(opts){
	opts		= opts		|| {};
	var charCode	= opts.charCode	|| 'f'.charCodeAt(0);
	var dblclick	= opts.dblclick !== undefined ? opts.dblclick : false;
	var element	= opts.element

	var toggle	= function(){
		if( THREEx.FullScreen.activated() ){
			THREEx.FullScreen.cancel();
		}else{
			THREEx.FullScreen.request(element);
		}		
	}

	// callback to handle keypress
	var __bind	= function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
	var onKeyPress	= __bind(function(event){
		// return now if the KeyPress isnt for the proper charCode
		if( event.which !== charCode )	return;
		// toggle fullscreen
		toggle();
	}, this);

	// listen to keypress
	// NOTE: for firefox it seems mandatory to listen to document directly
	document.addEventListener('keypress', onKeyPress, false);
	// listen to dblclick
	dblclick && document.addEventListener('dblclick', toggle, false);

	return {
		unbind	: function(){
			document.removeEventListener('keypress', onKeyPress, false);
			dblclick && document.removeEventListener('dblclick', toggle, false);
		}
	};
}

/**
 * @author mrdoob / http://mrdoob.com/
 * @author marklundin / http://mark-lundin.com/
 * @author alteredq / http://alteredqualia.com/
 */

THREE.AnaglyphEffect = function ( renderer, width, height ) {

	var eyeRight = new THREE.Matrix4();
	var eyeLeft = new THREE.Matrix4();
	var focalLength = 125;
	var _aspect, _near, _far, _fov;

	var _cameraL = new THREE.PerspectiveCamera();
	_cameraL.matrixAutoUpdate = false;

	var _cameraR = new THREE.PerspectiveCamera();
	_cameraR.matrixAutoUpdate = false;

	var _camera = new THREE.OrthographicCamera( -1, 1, 1, - 1, 0, 1 );

	var _scene = new THREE.Scene();

	var _params = { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat };

	if ( width === undefined ) width = 512;
	if ( height === undefined ) height = 512;

	var _renderTargetL = new THREE.WebGLRenderTarget( width, height, _params );
	var _renderTargetR = new THREE.WebGLRenderTarget( width, height, _params );

	var _material = new THREE.ShaderMaterial( {

		uniforms: {

			"mapLeft": { type: "t", value: _renderTargetL },
			"mapRight": { type: "t", value: _renderTargetR }

		},

		vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

			"	vUv = vec2( uv.x, uv.y );",
			"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform sampler2D mapLeft;",
			"uniform sampler2D mapRight;",
			"varying vec2 vUv;",

			"void main() {",

			"	vec4 colorL, colorR;",
			"	vec2 uv = vUv;",

			"	colorL = texture2D( mapLeft, uv );",
			"	colorR = texture2D( mapRight, uv );",

				// http://3dtv.at/Knowhow/AnaglyphComparison_en.aspx

			"	gl_FragColor = vec4( colorL.g * 0.7 + colorL.b * 0.3, colorR.g, colorR.b, colorL.a + colorR.a ) * 1.1;",

			"}"

		].join("\n")

	} );

	var mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), _material );
	_scene.add( mesh );

	this.setSize = function ( width, height ) {

		if ( _renderTargetL ) _renderTargetL.dispose();
		if ( _renderTargetR ) _renderTargetR.dispose();
		_renderTargetL = new THREE.WebGLRenderTarget( width, height, _params );
		_renderTargetR = new THREE.WebGLRenderTarget( width, height, _params );

		_material.uniforms[ "mapLeft" ].value = _renderTargetL;
		_material.uniforms[ "mapRight" ].value = _renderTargetR;

		renderer.setSize( width, height );

	};

	/*
	 * Renderer now uses an asymmetric perspective projection
	 * (http://paulbourke.net/miscellaneous/stereographics/stereorender/).
	 *
	 * Each camera is offset by the eye seperation and its projection matrix is
	 * also skewed asymetrically back to converge on the same projection plane.
	 * Added a focal length parameter to, this is where the parallax is equal to 0.
	 */

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === undefined ) camera.updateMatrixWorld();

		var hasCameraChanged = ( _aspect !== camera.aspect ) || ( _near !== camera.near ) || ( _far !== camera.far ) || ( _fov !== camera.fov );

		if ( hasCameraChanged ) {

			_aspect = camera.aspect;
			_near = camera.near;
			_far = camera.far;
			_fov = camera.fov;

			var projectionMatrix = camera.projectionMatrix.clone();
			// var eyeSep = focalLength / 30 * 0.5;
			var eyeSep = 0.05;
			// var eyeSepOnProjection = eyeSep * _near / focalLength;
			var eyeSepOnProjection = 0;
			var ymax = _near * Math.tan( THREE.Math.degToRad( _fov * 0.5 ) );
			var xmin, xmax;

			// translate xOffset

			eyeRight.elements[12] = eyeSep;
			eyeLeft.elements[12] = -eyeSep;

			// for left eye

			xmin = -ymax * _aspect + eyeSepOnProjection;
			xmax = ymax * _aspect + eyeSepOnProjection;

			projectionMatrix.elements[0] = 2 * _near / ( xmax - xmin );
			projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

			_cameraL.projectionMatrix.copy( projectionMatrix );

			// for right eye

			xmin = -ymax * _aspect - eyeSepOnProjection;
			xmax = ymax * _aspect - eyeSepOnProjection;

			projectionMatrix.elements[0] = 2 * _near / ( xmax - xmin );
			projectionMatrix.elements[8] = ( xmax + xmin ) / ( xmax - xmin );

			_cameraR.projectionMatrix.copy( projectionMatrix );

		}

		_cameraL.matrixWorld.copy( camera.matrixWorld ).multiply( eyeLeft );
		_cameraL.position.copy( camera.position );
		_cameraL.near = camera.near;
		_cameraL.far = camera.far;

		renderer.render( scene, _cameraL, _renderTargetL, true );

		_cameraR.matrixWorld.copy( camera.matrixWorld ).multiply( eyeRight );
		_cameraR.position.copy( camera.position );
		_cameraR.near = camera.near;
		_cameraR.far = camera.far;

		renderer.render( scene, _cameraR, _renderTargetR, true );

		renderer.render( _scene, _camera );

	};

	this.dispose = function() {
		if ( _renderTargetL ) _renderTargetL.dispose();
		if ( _renderTargetR ) _renderTargetR.dispose();
	}

};

var DT = (function () {
    'use strict';
    var DT = {},
        THREE = window.THREE || undefined,
        WebAudio = window.WebAudio || undefined,
        $ = window.$ || undefined,
        THREEx = window.THREEx || undefined,
        requestAnimFrame = function(){
            return (
                window.requestAnimationFrame       ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                function(/* function */ callback){
                    window.setTimeout(callback, 1000 / 60);
                }
            );
        }(),
        cancelAnimFrame = function(){
            return (
                window.cancelAnimationFrame       ||
                window.webkitCancelAnimationFrame ||
                window.mozCancelAnimationFrame    ||
                window.oCancelAnimationFrame      ||
                window.msCancelAnimationFrame     ||
                function(id){
                    window.clearTimeout(id);
                }
            );
        }();

    // Player Singleton Constructor
    DT.Player = function (options) {
        if (!DT.Player.__instance) {
            DT.Player.__instance = this;
        } else {
            return DT.Player.__instance;
        }
        this.currentHelth = options.currentHelth || 100;
        this.currentScore = options.currentScore || 0;
        this.destPoint = options.destPoint || {x: 0, y: 0};
        this.isInvulnerability = options.isInvulnerability || false;
        this.isFun = options.isFun || false;
        this.invulnerTimer = null;
        this.funTimer = null;
        this.jump = options.jump || false;
        this.jumpLength = 0; // not use
        this.jumpOffset = 2.2; // not use
    };

    DT.Player.prototype.changeHelth = function(delta) {
        if (delta > 0 || this.isInvulnerability === false) {
            var helth = this.currentHelth;
            if (helth > 0) {
                helth += delta;
                if (helth < 0) {
                    helth = 0;
                    DT.gameOver();
                }
                if (helth > 100) {
                    helth = 100;
                }
            }
            this.currentHelth = helth;
            $(function(){
                $('.helth').animate({
                    width: helth + '%'
                });
            });
        }
        return this;
    };

    DT.Player.prototype.makeInvuler = function (time) {
        this.invulnerTimer = (time || 10000) / 1000 * 60;
        this.isInvulnerability = true;
        // TODO: умешьшить связанность
        DT.shield.addToScene();
        return this;
    };

    DT.Player.prototype.stopInvulner = function () {
        this.invulnerTimer = 0;
        return this;
    };

    DT.Player.prototype.changeScore = function(delta) {
        var score = this.currentScore += delta;
        // TODO: отделить логику от интерфейса
        $(function(){
            $('.current_coins').text(score);
        });
        return this;
    };

    DT.Player.prototype.makeFun = function(time) {
        this.isFun = true;
        this.funTimer = (time || 10000) / 1000 * 60;
        // TODO: переделать на метод
        DT.speed.setChanger(-18);
        DT.stopSound(0);
        DT.playSound(1);
        //
        return this;
    };

    DT.Player.prototype.stopFun = function () {
        this.funTimer = 0;
        return this;
    };

    DT.Player.prototype.updateInvulnerability = function () {
        if (this.isInvulnerability) {
            this.invulnerTimer -= 1;
            if (this.invulnerTimer <= 0) {
                this.isInvulnerability = false;
                // TODO: уменьшить связанность
                DT.shield.removeFromScene();
                //
            } else {
                return this;
            }
        }
        return this;
    };

    DT.Player.prototype.updateFun = function () {
        if (this.isFun) {
            this.funTimer -= 1;
            if (this.funTimer <= 0) {
                this.isFun = false;
                // TODO: переделать на метод
                DT.speed.setChanger(0);
                DT.stopSound(1);
                DT.playSound(0);
                //
                clearInterval(DT.rainbow);
                DT.blink.doBlink('red', 5);
            } else if (this.funTimer % 6 === 0) {
                var color = new THREE.Color().setRGB(
                    DT.genRandomFloorBetween(0, 3),
                    DT.genRandomFloorBetween(0, 3),
                    DT.genRandomFloorBetween(0, 3)
                );
                DT.blink.doBlink(color, 2);
            }
        }
        return this;
    };

    DT.Player.prototype.update = function () {
        this.updateInvulnerability();
        this.updateFun();
        return this;
    };

    DT.Player.prototype.reset = function () {
        this.currentHelth = 100;
        this.currentScore = 0;
        this.destPoint = {x: 0, y: -2.5};
        this.isInvulnerability = false;
        this.isFun = false;
        this.jump = false;
        return this;
    };

    DT.player = new DT.Player({
        currentHelth: 100,
        currentScore: 0,
        destPoint: {x: 0, y: -2.5},
        isInvulnerability: false,
        isFun: false,
        jump: false
    });

    DT.Game = function () {
        this.id = null;
        this.param = {
            spacing: 3,
            spawnCoord: -200,
            opacityCoord: 2,
            dieCoord: 30,
            stonesCloseness: 18,
            globalVolume: 1,
            prevGlobalVolume: 1
        };
        this.speed = {
            value: 36,
            changer: 0,
            step: 0.6,
            increase: function () {
                this.value += (this.step / 60);
            },
            setChanger: function (changer) {
                this.changer = changer;
            },
            getChanger: function() {
                return this.changer;
            },
            getValue: function () {
                return (this.value + this.changer) / 60;
            }
        };
        this.startGame = function() {
            // for stats
            setStats();
            // for timer
            $('.gameTimer').css({'display': 'block'});
            requestAnimationFrame(function animate(nowMsec) {
                var deltaMsec = Math.min(200, nowMsec - DT.lastTimeMsec);
                // keep looping
                DT.id = requestAnimationFrame(animate);
                // measure time
                DT.lastTimeMsec = DT.lastTimeMsec || nowMsec - 1000 / 60;
                DT.lastTimeMsec = nowMsec;
                // call each update function
                DT.onRenderFcts.forEach(function(onRenderFct) {
                    onRenderFct(deltaMsec / 1000, nowMsec / 1000);
                });
            });
            if (!DT.gameWasStarted) {
                // control
                $(document).keydown(function(event) {
                    var destPoint = DT.player.destPoint,
                        changeDestPoint = DT.changeDestPoint,
                        k = event.keyCode;
                    // arrows control
                    if (k === 38) {
                        changeDestPoint(1, 0, destPoint);
                    }
                    if (k === 40) {
                        changeDestPoint(-1, 0, destPoint);
                    }
                    if (k === 37) {
                        changeDestPoint(0, -1, destPoint);
                    }
                    if (k === 39) {
                        changeDestPoint(0, 1, destPoint);
                    }
                    // speedUp
                    if (k === 16) {
                        DT.speed.setChanger(36);
                        if (DT.player.isFun) {
                            DT.stopSound(1);
                            DT.playSound(0);
                            clearInterval(DT.rainbow);
                            DT.player.isFun = false;
                            DT.blink.doBlink('red', 2);
                        }
                    }
                    if (k === 17) {
                        DT.player.makeFun();
                    }
                });
                $(document).keyup(function(event) {
                    var k = event.keyCode;
                    // speedDown
                    if (k === 16) {
                        DT.speed.setChanger(0);
                        DT.player.stopFun();
                    }
                });
                $(document).keyup(DT.handlers.pauseOnSpace);
                DT.gameWasStarted = true;
            }
        };
    };
    // TODO: refactor
    DT.param = {
        spacing: 3,
        spawnCoord: -200,
        opacityCoord: 2,
        dieCoord: 30,
        stonesCloseness: 18,
        globalVolume: 1,
        prevGlobalVolume: 1
    };
    //
    DT.speed = {
        value: 36,
        changer: 0,
        step: 0.6,
        increase: function () {
            this.value += (this.step / 60);
        },
        setChanger: function (changer) {
            this.changer = changer;
        },
        getChanger: function() {
            return this.changer;
        },
        getValue: function () {
            return (this.value + this.changer) / 60;
        }
    };

    DT.collections = {
        stones: [],
        fragments: [],
        coins: [],
        bonuses: [],
        caughtBonuses: []
    };

    DT.audio = {
        frequency: { // for audio visualization
            0: 400,
            1: 100
        },
        valueAudio: 0,
        webaudio: new WebAudio(),
        sounds: {
            catchCoin: 'sounds/coin.',
            gameover: 'sounds/gameover.',
            pause: 'sounds/pause.',
            stoneDestroy: 'sounds/stoneDestroy.',
            stoneMiss: 'sounds/stoneMiss.'
        },
        music: {
            0: 'sounds/theField_overTheIce.',
            1: 'sounds/heart.',
            2: 'sounds/space_ambient2.',
            started: [],
            startedAt: [],
            pausedAt: [],
            stopped: [],
            paused: []
        }
    };

    DT.renderer = new THREE.WebGLRenderer();

    DT.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 300);

    DT.scene = new THREE.Scene();

    DT.composer = null; // not use

    DT.onRenderFcts = [];

    DT.sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({color: 0xff0000}));

    DT.lights = {
        light: new THREE.PointLight(0xffffff, 0.75, 100),
        sphereLight: new THREE.PointLight(0xff0000, 1.75, 15),
        sphereLightning: new THREE.PointLight(0xff0000, 0.75, 7.5),
        directionalLight: new THREE.DirectionalLight(0xffffff, 0.25)
    };
    //
    DT.id = null;

    DT.lastTimeMsec = null;
    //
    DT.startGame = function() {
        // for stats
        setStats();
        // for timer
        $('.gameTimer').css({'display': 'block'});
        requestAnimationFrame(function animate(nowMsec) {
            var deltaMsec = Math.min(200, nowMsec - DT.lastTimeMsec);
            // keep looping
            DT.id = requestAnimationFrame(animate);
            // measure time
            DT.lastTimeMsec = DT.lastTimeMsec || nowMsec - 1000 / 60;
            DT.lastTimeMsec = nowMsec;
            // call each update function
            DT.onRenderFcts.forEach(function(onRenderFct) {
                onRenderFct(deltaMsec / 1000, nowMsec / 1000);
            });
        });
        if (!DT.gameWasStarted) {
            // control
            $(document).keydown(function(event) {
                var destPoint = DT.player.destPoint,
                    changeDestPoint = DT.changeDestPoint,
                    k = event.keyCode;
                // arrows control
                if (k === 38) {
                    changeDestPoint(1, 0, destPoint);
                }
                if (k === 40) {
                    changeDestPoint(-1, 0, destPoint);
                }
                if (k === 37) {
                    changeDestPoint(0, -1, destPoint);
                }
                if (k === 39) {
                    changeDestPoint(0, 1, destPoint);
                }
                // speedUp
                if (k === 16) {
                    DT.speed.setChanger(36);
                    if (DT.player.isFun) {
                        DT.stopSound(1);
                        DT.playSound(0);
                        clearInterval(DT.rainbow);
                        DT.player.isFun = false;
                        DT.blink.doBlink('red', 2);
                    }
                }
                if (k === 17) {
                    DT.player.makeFun();
                }
            });
            $(document).keyup(function(event) {
                var k = event.keyCode;
                // speedDown
                if (k === 16) {
                    DT.speed.setChanger(0);
                    DT.player.stopFun();
                }
            });
            $(document).keyup(DT.handlers.pauseOnSpace);
            DT.gameWasStarted = true;
        }
    };
    // 
    DT.GameObject = function (options) {
        this.tObject = new options.THREEConstructor(
            options.geometry,
            options.material
        );
        this.geometry = this.tObject.geometry;
        this.material = this.tObject.material;
        this.scene = options.scene || DT.scene;
    };
    DT.GameObject.prototype.addToScene = function () {
        this.scene.add(this.tObject);
        return this;
    };
    DT.GameObject.prototype.removeFromScene = function () {
        this.scene.remove(this.tObject);
        return this;
    };
    DT.GameObject.prototype.create = function () {
        // empty method
        console.log('try to call empty method');
        return this;
    };
    DT.GameObject.prototype.createAndAdd = function () {
        return this.create()
            .addToScene();
    };
    DT.GameObject.prototype.update = function (options) {
        return this.updateGeometry(options.geometry)
            .updateMaterial(options.material);
    };
    DT.GameObject.prototype.updateGeometry = function (options) {
        // empty method
        console.log('try to call empty method');
        return this;
    };
    DT.GameObject.prototype.updateMaterial = function (options) {
        // empty method
        console.log('try to call empty method');
        return this;
    };
    DT.GameObject.prototype.updateParam = function (param, options) {
        for (var prop in options) if (options.hasOwnProperty(prop)) {
            this.tObject[param][prop] += options[prop];
        }
        return this;
    };
    DT.GameObject.prototype.setParam = function (param, options) {
        for (var prop in options) if (options.hasOwnProperty(prop)) {
            this.tObject[param][prop] = options[prop];
        }
        return this;
    };

    // GameCollectionObject Constructor (Stone, Coin, Bonus)
    DT.GameCollectionObject = function (options) {
        DT.GameObject.apply(this, arguments);
        this.collection = options.collection;
    };
    DT.GameCollectionObject.prototype = Object.create(DT.GameObject.prototype);
    DT.GameCollectionObject.prototype.constructor = DT.GameCollectionObject;

    DT.GameCollectionObject.prototype.create = function () {
        this.collection.push(this);
        return this;
    };

    DT.GameCollectionObject.prototype.update = function (options) {
        if (this.tObject.position.z > options.dieCoord) {
            this.removeFromScene();
        } 
        if (this.tObject.position.z > options.opacityCoord) {
            if (this.tObject.children.length > 0) {
                this.tObject.children.forEach(function (el) {
                    el.material.transparent = true;
                    el.material.opacity = 0.5; 
                });
            } else {
                this.tObject.material = new THREE.MeshLambertMaterial({
                     shading: THREE.FlatShading,
                     transparent: true,
                     opacity: 0.5
                 });
            }
        }
        return this;
    };

    DT.GameCollectionObject.prototype.removeFromScene = function () {
        DT.GameObject.prototype.removeFromScene.apply(this, arguments);
        var ind = this.collection.indexOf(this);
        if (ind !== -1) {
            this.collection.splice(ind, 1);
        }
        return this;
    };

    // Shield Singleton Constructor
    DT.Shield = function (options) {
        if (!DT.Shield.__instance) {
            DT.Shield.__instance = this;
        } else {
            return DT.Shield.__instance;
        }
        DT.GameObject.apply(this, arguments);
        this.material.color = options.sphere.material.color;
        this.position = options.sphere.position;
    };
    DT.Shield.prototype = Object.create(DT.GameObject.prototype);
    DT.Shield.prototype.constructor = DT.Shield;

    DT.shield = new DT.Shield({
        THREEConstructor: THREE.Mesh,
        geometry: new THREE.CubeGeometry(1.3, 1.3, 1.3, 2, 2, 2),
        material: new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5
        }),
        sphere: DT.sphere
    });

    // Dust Constructor
    DT.Dust = function (options) {
        DT.GameObject.apply(this, arguments);
        this.number = options.number || 100;
    };
    DT.Dust.prototype = Object.create(DT.GameObject.prototype);
    DT.Dust.prototype.constructor = DT.Dust;

    DT.Dust.prototype.create = function () {
        for (var i = 0; i < this.number; i++) {
            this.geometry.vertices.push(new THREE.Vector3(
                DT.genRandomBetween(-10, 10),
                DT.genRandomBetween(-10, 10),
                DT.genRandomBetween(-100, 0)
            ));
        }
        this.material.visible = false;
        return this;
    };

    DT.Dust.prototype.updateMaterial = function (options) {
        if (!this.material.visible) {
            this.material.visible = true;
        }
        this.material.color = options.isFun ? options.color : new THREE.Color().setRGB(
            options.valueAudio/1/1 || 70/255,
            options.valueAudio/255/1 || 68/255,
            options.valueAudio/255/1 || 81/255
        );
        return this;
    };

    DT.Dust.prototype.updateGeometry = function (options) {
        this.geometry.vertices.forEach(function (el) {
            el.z += options.speed;
            if (el.z > 10) {
                el.x = DT.genRandomBetween(-10, 10);
                el.y = DT.genRandomBetween(-10, 10);
                el.z = -100;
            }
        });
        this.geometry.verticesNeedUpdate = true;
        return this;
    };
    // Dust object 
    DT.dust = new DT.Dust({
        geometry: new THREE.Geometry({}),
        material: new THREE.ParticleSystemMaterial({size: 0.25}),
        THREEConstructor: THREE.ParticleSystem
    });

    // Stone Constuctor
    DT.Stone = function (options) {
        var radius, color, x, y, depth, geometry, material,
            part = Math.random();
        // 
        if (part >= 0 && part < 0.16) {
            x = DT.genRandomBetween(-15, -5);
            y = DT.genRandomBetween(-15, -5);
        } else if (part >= 0.16 && part < 0.32){
            x = DT.genRandomBetween(5, 15);
            y = DT.genRandomBetween(5, 15);
        } else {
            x = DT.genRandomBetween(-5, 5);
            y = DT.genRandomBetween(-5, 5);
        }
        //
        if (Math.abs(x) > 5 || Math.abs(y) > 5) {
            radius = DT.genRandomBetween(1.5, 3);
            color = new THREE.Color(0x464451);
        } else {
            radius = DT.genRandomBetween(1, 2);
            depth = DT.genRandomFloorBetween(80, 100) / 255;
            color = new THREE.Color().setRGB(depth, depth, depth);
        }
        geometry = new THREE.IcosahedronGeometry(radius, 0);
        material = new THREE.MeshPhongMaterial({
            shading: THREE.FlatShading,
            color: color,
            specular: 0x111111,
            shininess: 100
        });
        DT.GameCollectionObject.apply(this, [{
            geometry: geometry,
            material: material,
            THREEConstructor: THREE.Mesh,
            collection: options.collection
        }]);
        this.setParam('position', {
            x: x,
            y: y,
            z: options.spawnCoord
        })
        .setParam('rotation', {
            x: Math.random(),
            y: Math.random()
        })
        .createAndAdd();
        this.distanceToSphere = null;
    };
    DT.Stone.prototype = Object.create(DT.GameCollectionObject.prototype);
    DT.Stone.prototype.constructor = DT.Stone;

    DT.Stone.prototype.update = function (options) {
        DT.GameCollectionObject.prototype.update.apply(this, arguments);
        var el = this.tObject;
        this.distanceToSphere = el.position.distanceTo(options.sphere.position);
        this.minDistance = options.sphere.geometry.radius + el.geometry.radius;
            
        if (this.distanceToSphere < this.minDistance) {
            DT.audio.sounds.stoneDestroy.play();
            DT.sendSocketMessage({
                type: 'vibr',
                time: 200
            });
            this.removeFromScene();

            DT.player.changeHelth(-19);
            // вызвать вспышку экрана
            if (DT.player.isInvulnerability === false) {
                DT.hit();
            }
        }
        if (this.distanceToSphere > this.minDistance && this.distanceToSphere < this.minDistance + 1 && el.position.z - options.sphere.position.z > 1) {
            DT.audio.sounds.stoneMiss.play();
        }
        if (DT.getDistance(options.sphere.position.x, options.sphere.position.y, el.position.z, el.position.x, el.position.y, el.position.z) < this.minDistance) {
            el.material.emissive = new THREE.Color().setRGB(
                el.material.color.r * 0.5,
                el.material.color.g * 0.5,
                el.material.color.b * 0.5);
        } else {
            el.material.emissive = new THREE.Color().setRGB(0,0,0);
        }
        this.updateParam('rotation', {x: 0.014, y: 0.014})
            .updateParam('position', {z: DT.speed.getValue()});
        return this;
    };
    // Coin Constuctor 
    DT.Coin = function (options) {
        var r = 0.5, i,
            coin_sides_geo = new THREE.CylinderGeometry( r, r, 0.05, 32, 1, true ),
            coin_cap_geo = new THREE.Geometry();
        for (i = 0; i < 100; i++) {
            var a = i * 1/100 * Math.PI * 2,
                z = Math.sin(a),
                xCosA = Math.cos(a),
                a1 = (i+1) * 1/100 * Math.PI * 2,
                z1 = Math.sin(a1),
                x1 = Math.cos(a1);
            coin_cap_geo.vertices.push(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(xCosA*r, 0, z*r),
                new THREE.Vector3(x1*r, 0, z1*r)
            );
            coin_cap_geo.faceVertexUvs[0].push([
                new THREE.Vector2(0.5, 0.5),
                new THREE.Vector2(xCosA/2+0.5, z/2+0.5),
                new THREE.Vector2(x1/2+0.5, z1/2+0.5)
            ]);
            coin_cap_geo.faces.push(new THREE.Face3(i*3, i*3+1, i*3+2));
        }
        coin_cap_geo.computeCentroids();
        coin_cap_geo.computeFaceNormals();
        
        var coin_cap_texture = THREE.ImageUtils.loadTexture('./img/avers.png'),
            coin_sides_mat = new THREE.MeshPhongMaterial({emissive: 0xcfb53b, color: 0xcfb53b}),
            coin_sides = new THREE.Mesh( coin_sides_geo, coin_sides_mat ),
            coin_cap_mat = new THREE.MeshPhongMaterial({emissive: 0xcfb53b, color: 0xcfb53b, map: coin_cap_texture}),
            coin_cap_top = new THREE.Mesh( coin_cap_geo, coin_cap_mat ),
            coin_cap_bottom = new THREE.Mesh( coin_cap_geo, coin_cap_mat );

        coin_cap_top.position.y = 0.05;
        coin_cap_bottom.position.y = -0.05;
        coin_cap_top.rotation.x = Math.PI;

        DT.GameCollectionObject.apply(this, [{
            THREEConstructor: THREE.Object3D,
            collection: options.collection
        }]);
        
        this.tObject.add(coin_sides);
        this.tObject.add(coin_cap_top);
        this.tObject.add(coin_cap_bottom);
        
        this.setParam('position', {
            x: options.x,
            y: options.y,
            z: options.z
        })
            .setParam('rotation', {
            x: 1.5,
            y: 0,
            z: options.zAngle
        })
            .createAndAdd();
    };
    DT.Coin.prototype = Object.create(DT.GameCollectionObject.prototype);
    DT.Coin.prototype.constructor = DT.Coin;

    DT.Coin.prototype.update = function (options) {
        DT.GameCollectionObject.prototype.update.apply(this, arguments);
        this.updateParam('rotation', {z: 0.05})
            .updateParam('position', {z: DT.speed.getValue()});
        var positon = this.tObject.position;
        var distanceBerweenCenters = positon.distanceTo(options.sphere.position);
        if (distanceBerweenCenters < 0.9) {
            this.removeFromScene();
            DT.player.changeScore(1);
            DT.audio.sounds.catchCoin.play();
            DT.sendSocketMessage({
                type: 'vibr',
                time: 10
            });
            DT.blink.doBlink(0xcfb53b, 60);
            DT.bump();
        }
        return this;
    };

    // Bonus Constuctor 
    DT.Bonus = function (options) {
        this.type = DT.genRandomFloorBetween(0, 2);
        DT.GameCollectionObject.apply(this, [{
            geometry: DT.listOfModels[this.type].geometry,
            material: DT.listOfModels[this.type].material,
            THREEConstructor: THREE.Mesh,
            collection: options.collection
        }]);
        this.setParam('position', {
                x: options.x,
                y: options.y,
                z: options.spawnCoord * 2
            })
            .setParam('scale', {
                x: DT.listOfModels[this.type].scale.x || 1,
                y: DT.listOfModels[this.type].scale.y || 1,
                z: DT.listOfModels[this.type].scale.z || 1
            })
            .setParam('rotation', {
                x: DT.listOfModels[this.type].rotation.x || 0,
                y: DT.listOfModels[this.type].rotation.y || 0,
                z: DT.listOfModels[this.type].rotation.z || 0
            })
            .createAndAdd();
        // TODO: сделать расширяемой возможность анимации
        if (this.type === 2) {
            DT.animation = new THREE.MorphAnimation(this.tObject);
            DT.animation.play();
        }
    };
    DT.Bonus.prototype = Object.create(DT.GameCollectionObject.prototype);
    DT.Bonus.prototype.constructor = DT.Bonus;

    DT.Bonus.prototype.update = function (options) {
        if (this.type === 0) {
            this.updateParam('rotation', {z: 0.05});
        }
        if (this.type === 1) {
            this.updateParam('rotation', {z: 0.05});
        }
        if (this.type === 2) {
            // this.updateParam('rotation', {z: 0.05});
        }
        
        this.updateParam('position', {z: DT.speed.getValue()});
        DT.GameCollectionObject.prototype.update.apply(this, arguments);
        if (DT.getDistance(this.tObject.position.x, this.tObject.position.y, this.tObject.position.z,
                options.sphere.position.x, options.sphere.position.y, options.sphere.position.z) < 1.0) {
            
            if (this.type === 0) {
                this.tObject.rotation.x += 0.2;
            }
            if (this.type === 1) {
                this.tObject.rotation.y += 0.2;
            }
            if (this.type === 2) {
                // this.tObject.rotation.z += 0.2;
            }
            
            this.tObject.scale.x *= 0.9;
            this.tObject.scale.y *= 0.9;
            this.tObject.scale.z *= 0.9;
            
            if (DT.getDistance(this.tObject.position.x, this.tObject.position.y, this.tObject.position.z,
                    options.sphere.position.x, options.sphere.position.y, options.sphere.position.z) < 0.9) {
                this.removeFromScene();
                DT.catchBonus(this.type);
            }
        }
    };

    DT.Collection = function (options) {
        this.collection = [];
        this.constructor = options.constructor;
    };

    DT.Collection.prototype.createObjects = function (options) {
        options.number = options.number || 1;
        options.collection = this.collection;
        return this;
    };

    DT.Collection.prototype.update = function (options) {
        this.collection.forEach(function (el) {
            el.update(options);
        });
        return this;
    };

    DT.Collection.prototype.removeObjects = function () {
        this.collection.forEach(function (el) {
            ei.removeFromScene();
        });
        return this;
    };


    DT.Stones = function () {
        if (!DT.Stones.__instance) {
            DT.Stones.__instance = this;
        } else {
            return DT.Stones.__instance;
        }
        DT.Collection.apply(this, [{
            constructor: DT.Stone
        }]);
    };
    DT.Stones.prototype = Object.create(DT.Collection.prototype);
    DT.Stones.prototype.constructor = DT.Stones;

    DT.Stones.prototype.createObjects = function (options) {
        DT.Collection.prototype.createObjects.apply(this, arguments);
        var el = this.collection[this.collection.length -1];

        if (el) {
            var dist = DT.getDistance(0, 0, DT.param.spawnCoord,
                el.tObject.position.x, el.tObject.position.y, el.tObject.position.z);
            if (dist <= DT.param.stonesCloseness) {
                return this;
            }
        }
        for (var i = 0; i < options.number; i++) {
            new this.constructor(options);
        }
        return this;
    };

    DT.Coins = function () {
        if (!DT.Coins.__instance) {
            DT.Coins.__instance = this;
        } else {
            return DT.Coins.__instance;
        }
        DT.Collection.apply(this, [{
            constructor: DT.Coin
        }]);
    };
    DT.Coins.prototype = Object.create(DT.Collection.prototype);
    DT.Coins.prototype.constructor = DT.Coins;

    DT.Coins.prototype.createObjects = function (options) {
        DT.Collection.prototype.createObjects.apply(this, arguments);
        if (!this.collection.length) {
            for (var i = 0; i < options.number; i++) {
                options.zAngle = i * 0.25;
                options.z = options.spawnCoord - i * 10;
                new this.constructor(options);
            }
        }
        return this;
    };

    DT.Bonuses = function (options) {
        if (!DT.Bonuses.__instance) {
            DT.Bonuses.__instance = this;
        } else {
            return DT.Bonuses.__instance;
        }
        DT.Collection.apply(this, [{
            constructor: DT.Bonus
        }]);
    };
    DT.Bonuses.prototype = Object.create(DT.Collection.prototype);
    DT.Bonuses.prototype.constructor = DT.Bonuses;

    DT.Bonuses.prototype.createObjects = function (options) {
        DT.Collection.prototype.createObjects.apply(this, arguments);
        if (!this.collection.length) {
            for (var i = 0; i < options.number; i++) {
                new this.constructor(options);
            }
        }
        return this;
    };

    DT.useBonuses = function (type) {
        // helth
        if (type === 0) DT.player.changeHelth(100);
        // invulnerability
        if (type === 1) DT.player.makeInvuler();
        // entertainment
        if (type === 2) DT.player.makeFun();
    };

    DT.catchBonus = function (type) {
        var caughtBonuses = DT.collections.caughtBonuses;
            if (!caughtBonuses.length || caughtBonuses[0] === type) {
                caughtBonuses.push(type);
                if (caughtBonuses.length === 3) {
                    DT.useBonuses(type);
                    var refreshBonus = setTimeout(function() {
                        caughtBonuses.length = 0;
                        clearTimeout(refreshBonus);
                    }, 100);
                }
            } else {
                caughtBonuses.length = 0;
                caughtBonuses.push(type);
            }
            DT.showBonuses(caughtBonuses);
    };

    DT.showBonuses = function (arr) {
        var n = arr.length;
        $(function(){
            $('.bonus').text(function(){
                if (arr[0] === 0) return 'H '.repeat(n);
                if (arr[0] === 1) return 'I '.repeat(n);
                if (arr[0] === 2) return 'E '.repeat(n);
            });
        });
        if (n === 3) {
            $('.bonus').fadeOut(300, function(){
                $('.bonus').text('').fadeIn(100);
            });
        }
    };

    // TODO: refactor
    DT.rainbow = null;
    DT.listOfModels = [
        {
            name: 'bonusH',
            scale: {x: 0.02, y: 0.02, z: 0.02},
            rotation: {x: Math.PI / 1.3, y: -Math.PI / 1.3, z: -Math.PI / 1.3}
        },
        {
            name: 'bonusI',
            scale: {x: 0.5, y: 0.5, z: 0.5},
            rotation: {x: Math.PI / 1.3, y: -Math.PI / 1.3, z: -Math.PI / 1.3}
        },
        {
            name: 'bonusE',
            scale: {x: 0.025, y: 0.025, z: 0.025},
            rotation: {x: 0, y: 0, z: 0}
        }];

    DT.blink = {
        color: new THREE.Color(),
        frames: 0,
        framesLeft: 0,
        dr: 0,
        dg: 0,
        db: 0,
        doBlink: function (color, frames) {
            var defClr = {r: 1, g: 0, b: 0};
            this.color = new THREE.Color(color);
            this.frames = frames;
            this.framesLeft = frames;
            this.dr = (defClr.r - this.color.r)/frames;
            this.dg = (defClr.g - this.color.g)/frames;
            this.db = (defClr.b - this.color.b)/frames;
        },
        update: function () {
            if (DT.blink.framesLeft === 0) {
                // DT.sphere.material.color = new THREE.Color('red');
                return;
            }
            if (DT.blink.framesLeft === DT.blink.frames) {
                DT.lights.sphereLight.color.r = DT.sphere.material.color.r = DT.blink.color.r;
                DT.lights.sphereLight.color.g = DT.sphere.material.color.g = DT.blink.color.g;
                DT.lights.sphereLight.color.b = DT.sphere.material.color.b = DT.blink.color.b;
            }
            if (DT.blink.framesLeft < DT.blink.frames) {
                DT.lights.sphereLight.color.r = DT.sphere.material.color.r += DT.blink.dr;
                DT.lights.sphereLight.color.g = DT.sphere.material.color.g += DT.blink.dg;
                DT.lights.sphereLight.color.b = DT.sphere.material.color.b += DT.blink.db;
            }
        DT.blink.framesLeft -= 1;
        },
    };

    DT.bgTexture = THREE.ImageUtils.loadTexture('img/bg.jpg');
    DT.gameWasStarted = false;
    DT.gameWasPaused = false;
    DT.gameWasOver = false;
    DT.handlers = {};
    DT.snapshot = null; // for restart
    DT.server = window.location.origin !== 'http://localhost' ? window.location.origin : 'http://192.168.1.36';
    DT.wasMuted = false;

    // HANDLERS
    DT.handlers.startOnSpace = function(event) {
        var k = event.keyCode;
        if (k === 32) {
            DT.startAfterChooseControl();
        }
    };
    DT.handlers.pauseOnSpace = function(event) {
        var k = event.keyCode;
        if (k === 32) {
            DT.handlers.pause();
        }
    };
    DT.handlers.restartOnSpace = function(event) {
        var k = event.keyCode;
        if (k === 32) {
            DT.handlers.restart();
        }
    };
    DT.handlers.fullscreen = function () {
        var isActivated = THREEx.FullScreen.activated();
        if (isActivated) {
            THREEx.FullScreen.cancel();
        } else {
            THREEx.FullScreen.request(document.body);
        }
    };
    DT.handlers.pause = function () {
        if (!DT.gameWasPaused) {
            DT.pauseOn();
        } else {
            DT.pauseOff();
        }
    };
    DT.handlers.mute = function() {
        if (DT.param.globalVolume === 1) {
            DT.setVolume(0);
            $('.music_button').html('N');
            DT.wasMuted = true;
        } else {
            DT.setVolume(1);
            $('.music_button').html('M');
            DT.wasMuted = false;
        }
    };
    DT.handlers.left = function () {
        DT.changeDestPoint(0, -1, DT.player.destPoint);
    };
    DT.handlers.right = function () {
        DT.changeDestPoint(0, 1, DT.player.destPoint);
    };
    DT.handlers.restart = function () {
        $('.game_over').hide();
        var iterator = function (el) {
            DT.scene.remove(el);
        };
        for (var collection in DT.collections) {
            if (DT.collections.hasOwnProperty(collection)) {
                DT.collections[collection].forEach(iterator);
            }
        }
        DT.player.reset();
        $('.current_coins').html('0');
        $('.bonus').html('');
        $('.gameTimer').html('0:00');
        $('.helth').css({width: '100%'});
        DT.speed = $.extend(true, {}, DT.snapshot.speed);
        DT.collections = $.extend(true, {}, DT.snapshot.collections);
        DT.gameTimer = 0;
        // DT.gameWasStarted = false;
        DT.audio.music.startedAt = [];
        DT.audio.music.pausedAt = [];
        DT.audio.music.stopped = [];
        DT.audio.music.paused = [];
        DT.audio.music.started = [];
        DT.startGame();
        DT.playSound(0);
        $(document).bind('keyup', DT.handlers.pauseOnSpace);
        $(document).unbind('keyup', DT.handlers.restartOnSpace);
        $('#one_more_time').unbind('click');
    };
    // auxiliary functions
    DT.setVolume = function (volume) {
        DT.param.globalVolume = volume;
        if (DT.param.prevGlobalVolume !== DT.param.globalVolume) {
            DT.gainNodes.forEach(function(el) {
                if (el) {
                    el.gain.value = DT.param.globalVolume;
                }
            });
            DT.param.prevGlobalVolume = DT.param.globalVolume;
        }
    };
    // возвращает cookie с именем name, если есть или undefined
    DT.getCookie = function (name) {
        var matches = document.cookie.match(
            new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
        );
        return matches ? decodeURIComponent(matches[1]) : undefined;
    };

    DT.getDistance = function (x1, y1, z1, x2, y2, z2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) + (z1 - z2) * (z1 - z2));
    };
    
    DT.genCoord = function(delta) {
        var offset = delta || DT.param.spacing,
        x = Math.random() * offset * 2 - offset,
        absX = Math.abs(x);
        if (absX <= offset && absX >= offset * 0.33 ) {
            if (x > 0) {
                return offset;
            }
            if (x < 0) {
                return offset * -1;
            }
        } else {
            return 0;
        }
    };
    // game
    DT.gameOver = function() {
        DT.gameWasOver = true;
        clearTimeout(DT.player.isFun);
        DT.stopSound(0);
        DT.stopSound(1);
        // DT.soundGameover.update();
        DT.audio.sounds.gameover.play();
        $(function(){
            $('.total_coins').text(DT.player.currentScore);
            $('.game_over').css({'display': 'table', 'opacity': '0'}).animate({'opacity': '1'}, 1000);
            // $(document).unbind('keydown').unbind('keyup');
        });
        setTimeout(function() {
            cancelAnimationFrame(DT.id);
        }, 300);
        DT.sendSocketMessage('gameover');
        DT.prepareToRestart();
    };
    // game
    DT.prepareToRestart = function() {
        $('#one_more_time').click(function () {
            DT.handlers.restart();
        });
        $(document).unbind('keyup', DT.handlers.pauseOnSpace);
        $(document).bind('keyup', DT.handlers.restartOnSpace);
    };
    // interface
    DT.hit = function() {
        $(function(){
            $('.error').html('ERROR ' + DT.genRandomFloorBetween(500, 511));
            $('.hit').css({'display': 'table'}).fadeOut(250);
        });
    };
    // player
    DT.changeDestPoint = function(dy, dx, destPoint) {
        if ((destPoint.x < DT.param.spacing && dx > 0) || (destPoint.x > -DT.param.spacing && dx < 0)) {
            destPoint.x += dx * DT.param.spacing;
        }
        // if (DT.sphere.position.y < -2 && dy > 0) {
        //     DT.player.jumpLength = 0;
        //     DT.player.jump = true;
        // }
        // if (dy < 0) {
        //     DT.player.jump = false;
        // }
    };
    // player
    DT.moveSphere = function(sphere, destPoint, n) {
        var i,
            iterator = function(aix) {
            var dx = destPoint[aix] - sphere.position[aix];
            if (Math.abs(dx) > 0.01) {
                sphere.position[aix] += dx > 0 ? 0.1 : -0.1;
            }
        };
        for (i = 0; i < n; i++) {
            ['x'].forEach(iterator);
        }
            ['y'].forEach(function(aix) {
                var dx = destPoint[aix] - sphere.position[aix];
                if (Math.abs(dx) > 0.01) {
                    sphere.position[aix] += dx > 0 ? 0.1 : -0.1;
                }
            });
    };

    DT.genRandomFloorBetween = function (min, max) {
        var rand = min - 0.5 + Math.random()*(max-min+1);
        rand = Math.round(rand);
        return rand;
    };

    DT.genRandomBetween = function (min, max) {
        return Math.random() * (max - min) + min;
    };

    DT.getSign = function () {
        var signVal = Math.random() - 0.5;
        return Math.abs(signVal)/signVal;
    };
    // player
    DT.bump = function (amp) {
        if (DT.player.isInvulnerability) return;
        var i;
        for (i = 0; i < 2; i++) {
            amp = amp || 0.15;
            DT.sphere.position.x += DT.getSign() * amp;
            DT.sphere.position.y += DT.getSign() * amp;
        }
     };

    DT.sendSocketMessage = function (options) {
        var data = {
            'type': options.type,
            'time': options.time,
            'gameCode': DT.initSocket.socket.gameCode,
            'sessionid': DT.initSocket.socket.socket.sessionid,
            'coinsCollect': DT.player.currentScore
        };
        if (DT.initSocket.socket) {
            DT.initSocket.socket.emit('message', data);
        }
    };
    // game
    DT.startAfterChooseControl = function () {
        if (!DT.gameWasStarted) {
            DT.startGame();
            DT.stopSound(2);
            DT.playSound(0);
            $('.choose_control').fadeOut(250);
            DT.gameWasStarted = true;
            DT.sendSocketMessage('gamestarted');
        }
        $(document).unbind('keyup',DT.handlers.startOnSpace);
    };

    DT.runApp = function () {
        DT.initSocket();
        DT.playSound(2);
        $(function() {
            $('.loader').fadeOut(250);
            $('.choose_control').css({'display': 'table', 'opacity': '0'}).animate({'opacity': '1'}, 250);
            $(document).keyup(DT.handlers.startOnSpace);
            $('.choose_wasd').click(function() {
                DT.startAfterChooseControl();
            });
            $('.choose_mobile').click(function() {
                DT.initPhoneControl();
            });
            $('.choose_webcam').click(function() {
                DT.enableWebcam();
            });
        });
    };

    DT.pauseOn = function () {
        if (!DT.gameWasPaused) {
            $('.menu_page').css({'display': 'table'});
            DT.stopSoundBeforPause();
            DT.audio.sounds.pause.play();
            cancelAnimationFrame(DT.id);
            DT.gameWasPaused = !DT.gameWasPaused;
        }
    };

    DT.pauseOff = function () {
        if (DT.gameWasPaused) {
            $('.menu_page').css({'display': 'none'});
            DT.playSoundAfterPause();
            DT.audio.sounds.pause.play();
            DT.startGame();
            DT.gameWasPaused = !DT.gameWasPaused;
        }
    };

    $(function(){
        $('.menu_button').click(function() {
            DT.pauseOn();
        });
        $('.resume').click(function() {
            DT.pauseOff();
        });
        $('.music_button').click(DT.handlers.mute);
        $('.fs_button').click(DT.handlers.fullscreen);
        $(document).keyup(function(event) {
            var k = event.keyCode;
            if (k === 77) {
                DT.handlers.mute();
            }
        });
        $(document).keyup(function(event) {
            var k = event.keyCode;
            if (k === 70) {
                DT.handlers.fullscreen();
            }
        });
        // BACKGROUND
        DT.backgroundMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(44, 22, 0),
            new THREE.MeshBasicMaterial({
                map: DT.bgTexture
            }));
        DT.backgroundMesh.material.depthTest = false;
        DT.backgroundMesh.material.depthWrite = false;
        DT.backgroundMesh.visible = false;
        DT.scene.add(DT.backgroundMesh);
        // MUSIC
        var context,
            counter = 0,
            buffers = [], sources=[], destination, analysers = [],
            freqDomain = [],
            onRenderFcts = DT.onRenderFcts;
        var audio = new Audio();
        var canPlayOgg = !!audio.canPlayType && audio.canPlayType('audio/ogg; codecs=\'vorbis\'') !== '';
        console.log('canPlayOgg', canPlayOgg);
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            context = new AudioContext();
        }
        catch(e) {
            alert('Opps.. Your browser do not support audio API');
        }
        DT.stopSound = function(index){
            if (DT.audio.music.stopped[index] === false) {
                if (index === 0 || DT.audio.music.paused[index] === false) {
                    DT.audio.music.pausedAt[index] = Date.now() - DT.audio.music.startedAt[index];
                } 
                sources[index].stop(index);
                DT.audio.music.stopped[index] = true;
                DT.audio.music.started[index] = false;
            }
        };

        DT.gainNodes = [];
        DT.playSound = function(index){
            var gainNodes = DT.gainNodes;
            if (!DT.audio.music.started[index]) {
                DT.audio.music.started[index] = true;
                sources[index] = context.createBufferSource();
                sources[index].loop = true;
                sources[index].buffer = buffers[index];
                destination = context.destination;
                gainNodes[index] = context.createGain();
                gainNodes[index].gain.value = DT.param.globalVolume;
                analysers[index] = context.createAnalyser();
                analysers[index].fftSize = 2048;
                analysers[index].minDecibels = -50;
                analysers[index].maxDecibels = -20;
                sources[index].connect(gainNodes[index]);
                gainNodes[index].connect(analysers[index]);
                analysers[index].connect(destination);
                onRenderFcts.push(function() {
                    visualize(index);
                });
                DT.audio.music.stopped[index] = false;
                if (DT.audio.music.pausedAt[index]) {
                    DT.audio.music.startedAt[index] = Date.now() - DT.audio.music.pausedAt[index];
                    sources[index].start(index, DT.audio.music.pausedAt[index] / 1000);
                } else {
                    DT.audio.music.startedAt[index] = Date.now();
                    sources[index].start(index);
                }
            }
        };

        DT.stopSoundBeforPause = function() {
            DT.audio.music.stopped.forEach(function(el, i) {
                DT.audio.music.paused[i] = el;
                DT.stopSound(i);
            });
        };

        DT.playSoundAfterPause = function() {
            DT.audio.music.paused.forEach(function(el, i) {
                if (!el) {
                    DT.playSound(i);
                }
            });
        };


        var initSound = function(arrayBuffer, bufferIndex) {
            context.decodeAudioData(arrayBuffer, function(decodedArrayBuffer) {
                buffers[bufferIndex] = decodedArrayBuffer;
                console.log('ready sound ' + bufferIndex);
                counter += 1;
                yepnope.showLoading(counter);
            }, function(e) {
                console.log('Error decoding file', e);
            });
        };

        // SOUNDS
        var ext = 'ogg';
        if (!canPlayOgg) {
            ext = 'mp3';
        }
        for (var prop in DT.audio.sounds) if (DT.audio.sounds.hasOwnProperty(prop)) {
            DT.audio.sounds[prop] = DT.audio.webaudio.createSound().load(DT.audio.sounds[prop] + ext);
        }

        var loadSoundFile = function(urlArr, bufferIndex) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', urlArr[bufferIndex] + ext, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function(e) {
                initSound(this.response, bufferIndex); // this.response is an ArrayBuffer.
            };
            xhr.send();
        };

        loadSoundFile(DT.audio.music, 0);
        loadSoundFile(DT.audio.music, 1);
        loadSoundFile(DT.audio.music, 2);
        
        var visualize = function(index) {
            freqDomain[index] = new Uint8Array(analysers[index].frequencyBinCount);
            analysers[index].getByteFrequencyData(freqDomain[index]);
            DT.audio.valueAudio = getFrequencyValue(DT.audio.frequency[index], index);
        };
        
        var getFrequencyValue = function(frequency, bufferIndex) {
            var nyquist = context.sampleRate/2,
                index = Math.round(frequency/nyquist * freqDomain[bufferIndex].length);
            return freqDomain[bufferIndex][index];
        };

        // BLUR
        // var renderer = DT.renderer,
        //     scene = DT.scene,
        //     camera = DT.camera,
        //     composer,
        //     hblur, vblur,
        //     bluriness = 0,
        //     winResizeBlur;
        
            // composer = new THREE.EffectComposer( renderer );
        // composer.addPass( new THREE.RenderPass( scene, camera ) );
        
            // hblur = new THREE.ShaderPass( THREE.HorizontalBlurShader );
        // hblur.uniforms[ 'h' ].value *= bluriness;
        // composer.addPass( hblur );
        
            // vblur = new THREE.ShaderPass( THREE.VerticalBlurShader );
        // vblur.uniforms[ 'v' ].value *= bluriness;
        // vblur.renderToScreen = true;
        // composer.addPass( vblur );
        // DT.composer = composer;
        // winResizeBlur   = new THREEx.WindowResize(composer, camera);
        
            // add update function to webaudio prototype
        WebAudio.Sound.prototype.update = function() {
            this.volume(DT.param.globalVolume);
        };
        WebAudio.Sound.prototype.play = function(time){
            this.volume(DT.param.globalVolume);
            // handle parameter polymorphism
            if( time ===  undefined )   time    = 0;
            // if not yet playable, ignore
            // - usefull when the sound download isnt yet completed
            if( this.isPlayable() === false )   return;
            // clone the bufferSource
            var clonedNode  = this._chain.cloneBufferSource();
            // set the noteOn
            clonedNode.start(time);
            // create the source object
            var source  = {
                node    : clonedNode,
                stop    : function(time){
                    if( time ===  undefined )   time    = 0;
                    this.node.stop(time);
                    return source;  // for chained API
                }
            };
            // return it
            return source;
        };
        // change IcosahedronGeometry prototype
        THREE.IcosahedronGeometry = function ( radius, detail ) {
            this.radius = radius;
            this.detail = detail;
            var t = ( 1 + Math.sqrt( 5 ) ) / 2;
            var vertices = [
                [ -1,  t,  0 ], [  1, t, 0 ], [ -1, -t,  0 ], [  1, -t,  0 ],
                [  0, -1,  t ], [  0, 1, t ], [  0, -1, -t ], [  0,  1, -t ],
                [  t,  0, -1 ], [  t, 0, 1 ], [ -t,  0, -1 ], [ -t,  0,  1 ]
            ];
        
                vertices = vertices.map(function(el) {
                return el.map(function(el) {
                    return el * Math.random();
                });
            });
        
                var faces = [
                [ 0, 11,  5 ], [ 0,  5,  1 ], [  0,  1,  7 ], [  0,  7, 10 ], [  0, 10, 11 ],
                [ 1,  5,  9 ], [ 5, 11,  4 ], [ 11, 10,  2 ], [ 10,  7,  6 ], [  7,  1,  8 ],
                [ 3,  9,  4 ], [ 3,  4,  2 ], [  3,  2,  6 ], [  3,  6,  8 ], [  3,  8,  9 ],
                [ 4,  9,  5 ], [ 2,  4, 11 ], [  6,  2, 10 ], [  8,  6,  7 ], [  9,  8,  1 ]
            ];
            THREE.PolyhedronGeometry.call( this, vertices, faces, radius, detail );
        
            };
        THREE.IcosahedronGeometry.prototype = Object.create( THREE.Geometry.prototype );
        
            // add method repeat
        String.prototype.repeat = function(num) {
            return new Array( num + 1 ).join( this );
        };
        // LOADER
        var loader = new THREE.JSONLoader(true), // init the loader util
            loadModel,
            listOfModels = DT.listOfModels;
        
            // init loading
        loadModel = function(modelObj) {
            loader.load('js/models/' + modelObj.name + '.js', function (geometry, materials) {
            // create a new material
            if (modelObj.name === 'bonusE') {
                modelObj.material = new THREE.MeshLambertMaterial( { color: 0x606060, morphTargets: true } );
                modelObj.material.emissive.r = modelObj.material.color.r * 0.5;
                modelObj.material.emissive.g = modelObj.material.color.g * 0.5;
                modelObj.material.emissive.b = modelObj.material.color.b * 0.5;
            } else {
                modelObj.material = new THREE.MeshFaceMaterial( materials );
                // shining of bonuses
                modelObj.material.materials.forEach(function (el) {
                    el.emissive.r = el.color.r * 0.5;
                    el.emissive.g = el.color.g * 0.5;
                    el.emissive.b = el.color.b * 0.5;
                });
            }
        
                modelObj.geometry = geometry;
        
                });
            return modelObj;
        };
        
            listOfModels.map(function(el) {
            loadModel(el);
        });
        
            // WEBCAM CONTROL
        DT.enableWebcam = function () {
            // // Game config
            // var leftBreakThreshold = -5;
            // var leftTurnThreshold = -10;
            // var rightBreakThreshold = 5;
            // var rightTurnThreshold = 10;
            // // Получаем элементы video и canvas
            
                    // var videoInput = document.getElementById('vid');
            // var canvasInput = document.getElementById('compare');
            // var debugOverlay = document.getElementById('debug');
        
                // var canvasContext = canvasInput.getContext('2d');
            // // переворачиваем canvas зеркально по горизонтали
            // canvasContext.translate(canvasInput.width, 0);
            // canvasContext.scale(-1, 1);
        
                // debugOverlay.style.height = '100%';
            // debugOverlay.style.opacity = '0.1';
            // debugOverlay.style.zIndex = '0';
            
                    // // Определяем сообщения, выдаваемые библиотекой
            
                    // statusMessages = {
            //     'whitebalance' : 'Проверка камеры или баланса белого',
            //     'detecting' : 'Обнаружено лицо',
            //     'hints' : 'Что-то не так, обнаружение затянулось. Попробуйте сместиться относительно камеры',
            //     'redetecting' : 'Лицо потеряно, поиск..',
            //     'lost' : 'Лицо потеряно',
            //     'found' : 'Слежение за лицом'
            // };
            
                    // supportMessages = {
            //     'no getUserMedia' : 'Браузер не поддерживает getUserMedia',
            //     'no camera' : 'Не обнаружена камера.'
            // };
            
                    // document.addEventListener('headtrackrStatus', function(event) {
            //     if (event.status in supportMessages) {
            //         console.log(supportMessages[event.status]);
            //         $('.message').html(supportMessages[event.status])
            //     } else if (event.status in statusMessages) {
            //         console.log(statusMessages[event.status]);
            //         $('.message').html(statusMessages[event.status])
            //     }
            //     if (event.status === 'found' && !DT.gameWasStarted) {
                    // DT.startAfterChooseControl();
            //     }
            // }, true);
            
                    // // Установка отслеживания
            
                    // var htracker = new headtrackr.Tracker({altVideo : {ogv : '', mp4 : ''}, calcAngles : true, ui : false, headPosition : false, debug : debugOverlay});
            // htracker.init(videoInput, canvasInput);
            // htracker.start();
            
                    // // Рисуем прямоугольник вокруг «пойманного» лица
            
                    // document.addEventListener('facetrackingEvent', function( event ) {
            //     // once we have stable tracking, draw rectangle
            //     if (event.detection == 'CS') {
            //         var angle = Number(event.angle *(180/ Math.PI)-90);
            //         // console.log(angle);
            //         if(angle < leftBreakThreshold) {
            //             if(angle > leftTurnThreshold) {
            //                 DT.player.destPoint.x = 0;
            //             } else {
            //                 DT.player.destPoint.x = -DT.param.spacing;
            //             }
            //         } else if (angle > rightBreakThreshold) {
            //             if(angle < rightTurnThreshold) {
            //                 DT.player.destPoint.x = 0;
            //             } else {
            //                 DT.player.destPoint.x = DT.param.spacing;
            //             }
            //         } else {
            //             DT.player.destPoint.x = 0;
            //         }
            //     }
            // });
        
            // alt realization
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;
        window.URL = window.URL || window.webkitURL;
        
        var camvideo = document.getElementById('vid');

        if (!navigator.getUserMedia) {
            $('.message').html('Sorry. <code>navigator.getUserMedia()</code> is not available.');
        }
        navigator.getUserMedia({video: true}, gotStream, noStream);
        
        function gotStream(stream) {
            if (window.URL) {
                camvideo.src = window.URL.createObjectURL(stream);
            } 
            else { // Opera
                camvideo.src = stream;
            }
            camvideo.onerror = function(e) {
                stream.stop();
            };
            stream.onended = noStream;
            //start game
            DT.startAfterChooseControl();
        }
        
        function noStream(e) {
            var msg = 'No camera available.';
            if (e.code == 1) 
            {   msg = 'User denied access to use camera.';   }
            console.log(msg);
        }
        
        // assign global variables to HTML elements
        console.log(window.innerHeight, window.innerWidth);
        var video = document.getElementById( 'vid' );
        var videoCanvas = document.getElementById( 'debug' );
        var videoContext = videoCanvas.getContext( '2d' );
        $('#debug').css({
            'height': window.innerHeight,
            'width': window.innerWidth,
            'opacity': 0.2
        });
        
        var blendCanvas  = document.getElementById( 'compare' );
        var blendContext = blendCanvas.getContext('2d');
        $('#compare').css({
            'height': window.innerHeight,
            'width': window.innerWidth,
            'opacity': 0.2
        });
        
        $('.cam').css({
            'background-color': 'rgba(255,255,255,0.2)'
        });
        $('.center').css({
            'background-color': 'rgba(0,0,0,0.2)',
            'width': '33%',
            'height': '100%',
            'margin-left': '33%'
        });
        
        // these changes are permanent
        videoContext.translate(320, 0);
        videoContext.scale(-1, 1);
        
        // background color if no video present
        videoContext.fillStyle = '#005337';
        videoContext.fillRect( 0, 0, videoCanvas.width, videoCanvas.height );
        
        var buttons = [];
        
        var button1 = new Image();
        button1.src ='img/lr.png';
        var buttonData1 = { name:'left', image:button1, x:0, y:0, w:100, h:240, coord: -DT.param.spacing };
        buttons.push( buttonData1 );
        
            var button2 = new Image();
        button2.src ='img/lr.png';
        var buttonData2 = { name:'right', image:button2, x:220, y:0, w:100, h:240, coord: DT.param.spacing };
        buttons.push( buttonData2 );
        
        var button3 = new Image();
        button3.src ='img/c.png';
        var buttonData3 = { name:'center', image:button3, x:100, y:0, w:120, h:240, coord: 0 };
        buttons.push( buttonData3 );
        
        // start the loop
        animate();
        function animate() {
            requestAnimationFrame( animate );
            render();
            blend();
            checkAreas();
        }
        
        function render() { 
            if ( video.readyState === video.HAVE_ENOUGH_DATA ) {
                // mirror video
                videoContext.drawImage( video, 0, 0, videoCanvas.width, videoCanvas.height );
            }
        }
        var lastImageData;
        function blend() {
            var width  = videoCanvas.width;
            var height = videoCanvas.height;
            // get current webcam image data
            var sourceData = videoContext.getImageData(0, 0, width, height);
            // create an image if the previous image doesn't exist
            if (!lastImageData) lastImageData = videoContext.getImageData(0, 0, width, height);
            // create a ImageData instance to receive the blended result
            var blendedData = videoContext.createImageData(width, height);
            // blend the 2 images
            differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);
            // draw the result in a canvas
            blendContext.putImageData(blendedData, 0, 0);
            // store the current webcam image
            lastImageData = sourceData;
        }
        function differenceAccuracy(target, data1, data2) {
            if (data1.length != data2.length) return null;
            var i = 0;
            while (i < (data1.length * 0.25)) {
                var average1 = (data1[4*i] + data1[4*i+1] + data1[4*i+2]) / 3;
                var average2 = (data2[4*i] + data2[4*i+1] + data2[4*i+2]) / 3;
                var diff = threshold(fastAbs(average1 - average2));
                target[4*i]   = diff;
                target[4*i+1] = diff;
                target[4*i+2] = diff;
                target[4*i+3] = 0xFF;
                ++i;
            }
        }
        function fastAbs(value) {
            return (value ^ (value >> 31)) - (value >> 31);
        }
        function threshold(value) {
            return (value > 0x15) ? 0xFF : 0;
        }
        
            // check if white region from blend overlaps area of interest (e.g. handlers)
        function checkAreas() {
            var b, l = buttons.length;
            for (b = 0; b < l; b++) {
                // get the pixels in a note area from the blended image
                // calculate the average lightness of the blended data
                var blendedData = blendContext.getImageData( buttons[b].x, buttons[b].y, buttons[b].w, buttons[b].h ),
                    i = 0,
                    sum = 0,
                    countPixels = blendedData.data.length * 0.25;
                while (i < countPixels) {
                    sum += (blendedData.data[i*4] + blendedData.data[i*4+1] + blendedData.data[i*4+2]);
                    ++i;
                }
                // calculate an average between of the color values of the note area [0-255]
                var average = Math.round(sum / (3 * countPixels));
                // more than 20% movement detected
                if (average > 30) {
                    console.log( 'Button ' + buttons[b].name + ' triggered.' ); // do stuff
                    // messageArea.innerHTML = '<font size='+4' color=white>'+ buttons[b].name + '</b></font>';
                    DT.player.destPoint.x = buttons[b].coord;
                }
            }
        }
    };

    DT.initPhoneControl = function() {
        $('.message').html('Please open <span style=\'color: red\'>' + DT.server +'/m</span> with your phone and enter code <span style=\'font-weight:bold; color: red\' id=\'socketId\'></span>');
        $('#socketId').html(DT.initSocket.socket.gameCode);
    };

    DT.initSocket = function() {
        // Game config
        var leftBreakThreshold = -3,
            leftTurnThreshold = -20,
            rightBreakThreshold = 3,
            rightTurnThreshold = 20,
            // set socket
            socket = DT.initSocket.socket = io.connect(DT.server);
        // When initial welcome message, reply with 'game' device type
        socket.on('welcome', function(data) {
            socket.emit('device', {'type':'game', 'cookieUID': DT.getCookie('UID')});
        });
        // We receive our game code to show the user
        socket.on('initialize', function(gameCode) {
            socket.gameCode = gameCode;
        });
        // When the user inputs the code into the phone client,
        //  we become 'connected'.  Start the game.
        socket.on('connected', function(data) {
            $('#gameConnect').hide();
            $('#status').hide();
            DT.startAfterChooseControl();
        });
            // When the phone is turned, turn the vehicle
        socket.on('turn', function(turn) {
            if(turn < leftBreakThreshold) {
                if(turn > leftTurnThreshold) {
                    DT.player.destPoint.x = 0;
                } else {
                    DT.player.destPoint.x = -DT.param.spacing;
                }
            } else if (turn > rightBreakThreshold) {
                if(turn < rightTurnThreshold) {
                    DT.player.destPoint.x = 0;
                } else {
                    DT.player.destPoint.x = DT.param.spacing;
                }
            } else {
                DT.player.destPoint.x = 0;
            }
        });
        socket.on('click', function(click) {
            DT.handlers[click]();
        });
    };
    DT.updateGameTimer = function (timer) {
            var sec, min;
            sec = timer / 60;
            min = Math.floor(sec / 60);
            sec = sec % 60;
            sec = sec < 10 ? '0' + sec.toString() : sec;
            $('.gameTimer').html(min + ':' + sec);
            $('title').html(min + ':' + sec + ' in digital trip');
        };
    });
    // STATS
    var setStats = function () {
        var body = document.getElementsByTagName('body')[0];
        DT.stats = DT.stats|| new Stats();
        DT.stats.domElement.style.position = 'absolute';
        DT.stats.domElement.style.top = '0px';
        DT.stats.domElement.style.zIndex = 100;
        body.appendChild( DT.stats.domElement );
        DT.stats2 = DT.stats2 || new Stats();
        DT.stats2.setMode(1); // 0: fps, 1: ms
        DT.stats2.domElement.style.position = 'absolute';
        DT.stats2.domElement.style.top = '0px';
        DT.stats2.domElement.style.left = '80px';
        DT.stats2.domElement.style.zIndex = 100;
        body.appendChild( DT.stats2.domElement );
    };
    return DT;
} ());
(function () {
    'use strict';
    // when resize
    var winResize = new THREEx.WindowResize(DT.renderer, DT.camera),
        dieCoord = DT.param.dieCoord,
        lens,
        emitter,
        fragmentsPosition = {x: -1000, y: 0, z: 0},
        fragmentsCounter = 0;

    // DT.renderer
    DT.renderer.setSize(window.innerWidth, window.innerHeight);
    DT.renderer.physicallyBasedShading = true;
    document.body.appendChild(DT.renderer.domElement);

    // DT.camera
    DT.camera.position.set(0, 0.5, 15);
    DT.camera.position.z = DT.camera.z = 15;
    lens = DT.camera.lens = 35;

    // DT.sphere
    DT.sphere.position.set(0, -2.5, 0);

    // DT.lights
    DT.lights.light.position.set(0, 0, -1);
    DT.scene.add(DT.lights.light);

    DT.lights.sphereLight.position.set(0, 0, 0);
    DT.scene.add(DT.lights.sphereLight);

    DT.lights.directionalLight.position.set(0, 0, 1);
    DT.scene.add(DT.lights.directionalLight);

    // DT.dust
    DT.dust.createAndAdd();

    // create the emitter for sphere tail
    emitter = Fireworks.createEmitter({nParticles : 100})
        .effectsStackBuilder()
            .spawnerSteadyRate(25)
            .position(Fireworks.createShapePoint(0, 0, 0))
            .velocity(Fireworks.createShapePoint(0, 0, 2))
            .lifeTime(0.7, 0.7)
            .randomVelocityDrift(Fireworks.createVector(0, 0, 0))
            .renderToThreejsParticleSystem({
                particleSystem  : function(emitter){
                    var i,
                        geometry    = new THREE.Geometry(),
                        texture = Fireworks.ProceduralTextures.buildTexture(),
                        material    = new THREE.ParticleBasicMaterial({
                            color       : new THREE.Color().setHSL(1, 0, 0.3).getHex(),
                            size        : 100,
                            sizeAttenuation : false,
                            vertexColors    : true,
                            map     : texture,
                            blending    : THREE.AdditiveBlending,
                            depthWrite  : false,
                            transparent : true
                        }),
                        particleSystem = new THREE.ParticleSystem(geometry, material);
                        particleSystem.dynamic  = true;
                        particleSystem.sortParticles = true;
                    // init vertices
                    for(i = 0; i < emitter.nParticles(); i++){
                        geometry.vertices.push( new THREE.Vector3() );
                    }
                    // init colors
                    geometry.colors = new Array(emitter.nParticles());
                    for(i = 0; i < emitter.nParticles(); i++){
                        geometry.colors[i]  = DT.sphere.material.color;
                    }
                    
                    DT.scene.add(particleSystem);
                    particleSystem.position = DT.sphere.position;
                    return particleSystem;
                }
            }).back()
        .start();
    // focus and blur events
    $(function() {
        $(window).focus(function() {
            if (!DT.wasMuted) {
                DT.setVolume(1);
            }
        });
        $(window).blur(function() {
            if (DT.gameWasStarted && !DT.gameWasPaused && !DT.gameWasOver) {
                DT.handlers.pause();
            }
            DT.setVolume(0);
        });
    });

    // EFFECT
    // var effect = new THREE.ParallaxBarrierEffect( DT.renderer );
    var effect = new THREE.AnaglyphEffect( DT.renderer );

    //////////////////////////////////////////////
    // ON RENDER 
    //////////////////////////////////////////////
    // EMITTER Particle system - sphere tail
    DT.onRenderFcts.push(function() {
        emitter._particles.forEach(function(el) {
            el.velocity.vector.z += DT.audio.valueAudio/28;
        });
    });

    var prevTime = Date.now();
    // render the scene
    DT.onRenderFcts.push(function(delta, now) {
        DT.renderer.render(DT.scene, DT.camera);
        if (DT.player.isFun) {
            effect.render(DT.scene, DT.camera);
            effect.setSize( window.innerWidth, window.innerHeight );
        }
        if (!DT.backgroundMesh.visible) {
            DT.backgroundMesh.visible = true;
        }
        emitter.update(delta).render();
        DT.stats.update();
        DT.stats2.update();
        DT.speed.increase();
        if ( DT.animation ) {
            var time = Date.now();
            DT.animation.update( time - prevTime );
            prevTime = time;
        }
    });
    // game timer
    DT.gameTimer = 0;
    DT.onRenderFcts.push(function () {
        DT.gameTimer += 1;
        if (DT.gameTimer % 60 === 0) {
            DT.updateGameTimer(DT.gameTimer);
        }
    });
    // LENS
    DT.onRenderFcts.push(function() {
        var camOffset = 6, camDelta = 0.1,
            lensOffset = 18, lensDelta = 0.3;
        // var composer = DT.composer;
        if (DT.speed.getChanger() > 0) {
            DT.camera.position.z = Math.max(DT.camera.position.z -= camDelta, DT.camera.z - camOffset);
            lens = Math.max(lens -= lensDelta, DT.camera.lens - lensOffset);
            // composer.render();
        } else if (DT.speed.getChanger() < 0) {
            DT.camera.position.z = Math.min(DT.camera.position.z += camDelta, DT.camera.z + camOffset);
            lens = Math.min(lens += lensDelta, DT.camera.lens + lensOffset);
            // composer.render();
        } else {
            var delta = DT.camera.lens - lens;
            if (delta < 0) {
                
                DT.camera.position.z = Math.max(DT.camera.position.z -= camDelta, DT.camera.z);
                lens = Math.max(lens -= lensDelta, DT.camera.lens);
            } else {
                
                DT.camera.position.z = Math.min(DT.camera.position.z += camDelta, DT.camera.z);
                lens = Math.min(lens += lensDelta, DT.camera.lens);
            }
        }
        DT.camera.setLens(lens);
    });
    // stones lifecicle, rotation and moving
    DT.onRenderFcts.push(function() {
        // create and update collections
        new DT.Stones()
            .createObjects({
                spawnCoord: DT.param.spawnCoord,
            })
            .update({
                dieCoord: DT.param.dieCoord,
                opacityCoord: DT.param.opacityCoord,
                sphere: DT.sphere
            });
        new DT.Coins()
            .createObjects({
                x: DT.genCoord(),
                y: -2.5,
                spawnCoord: DT.param.spawnCoord,
                zAngle: 0,
                number: 10
            })
            .update({
                dieCoord: DT.param.dieCoord,
                opacityCoord: DT.param.opacityCoord,
                sphere: DT.sphere
            });
        new DT.Bonuses()
            .createObjects({
                x: DT.genCoord(),
                y: -2.5,
                spawnCoord: DT.param.spawnCoord,
            })
            .update({
                dieCoord: DT.param.dieCoord,
                opacityCoord: DT.param.opacityCoord,
                sphere: DT.sphere
            });
    });
    // sphere moving
    DT.onRenderFcts.push(function() {
        DT.moveSphere(DT.sphere, DT.player.destPoint, 3);
        DT.lights.sphereLight.position.x = DT.sphere.position.x;
        DT.lights.sphereLight.position.y = DT.sphere.position.y;
    });
    // PLAYER
    DT.onRenderFcts.push(function () {
        DT.player.update();
    });
    // BLINK
    DT.onRenderFcts.push(function() {
        DT.blink.update();
    });
    // DUST
    DT.onRenderFcts.push(function () {
        DT.dust.update({
            material: {
                isFun: DT.player.isFun,
                valueAudio: DT.audio.valueAudio,
                color: DT.sphere.material.color
            }, 
            geometry: {
                speed: DT.speed.getValue()
            }
        });
    });
    DT.snapshot = $.extend(true, {}, DT);
}());
//# sourceMappingURL=game.js.map