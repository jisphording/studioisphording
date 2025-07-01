// ---------- ---------- ---------- ---------- ---------- //
// E X P E R I E N C E //
// ---------- ---------- ---------- ---------- ---------- //
//
// The main WebGL Experience Module. 
// This has to be called by the app's index.js.
// This is the app manager. Everything app-related is managed and dispatched from here.

// Import external libraries
import * as THREE from 'three'

// MODULES
import { Sizes } from './../utils/Sizes.mjs'
import { Time } from './../utils/Time.mjs'
import { Camera } from './Camera.mjs'
import { Renderer } from './Renderer.mjs'
import { Debug } from './../utils/Debug.mjs'
import { Resources } from './../utils/Resources.mjs'

// EXPERIENCE WORLDS & RESOURCES
import { World as World_01 } from '../projects/isphording-inneneinrichtung/World.mjs'
import World_01_Sources from '../projects/isphording-inneneinrichtung/World_Sources.mjs'

import { World as World_02 } from '../projects/moodboard/World.mjs'
import World_02_Sources from '../projects/moodboard/World_Sources.mjs'

// Storing the singleton instance
let instance = null

// C L A S S
/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */

export class Experience
{
	constructor( canvas, world, clearColor )
	{
		// SINGLETON
		//
		// Since different modules need access to data from the running experience
		// the Singleton approach is used to access experience data from all modules.
		if( instance )
		{
			return instance
		}

		instance = this

		// ### DEV ### - Global Access
		window.experience = this

		// OPTIONS
		this.canvas = canvas

		// SETUP
		this.scene = new THREE.Scene()
		this.sizes = new Sizes( this.canvas )
		this.time = new Time()
		this.camera = new Camera()
		this.renderer = new Renderer( clearColor )
		this.debug = new Debug()

		// SPECIFIC WORLD
		// This is probably really verbose and shoould be refactored.
		if ( world == 'World_01' ) { 
			this.resources = new Resources( World_01_Sources )
			this.world = new World_01()
		} 
		else if ( world == 'World_02' ) { 
			this.resources = new Resources( World_02_Sources )
			this.world = new World_02()
		}

		// LISTEN TO EVENT EMITTERS
		
		// Sizes "resize" event
		this.sizes.on( 'resize', () =>
		{
			this.resize()
		})

		// Time "tick" event
		this.time.on( 'tick', () =>
		{
			this.update()
		})
	}

	// R E S I Z E
	/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */

	resize()
	{
		this.camera.resize()
		this.renderer.resize()
	}

	// U P D A T E 
	/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */

	update()
	{
		this.world.update()
		this.camera.update()
		this.renderer.update()
	}
}