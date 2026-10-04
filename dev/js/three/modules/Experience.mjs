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
import { loadWorld } from '../worlds.mjs'

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
		if ( import.meta.env.DEV ) window.experience = this

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
		// Each world is its own lazily imported chunk, so it is built once the
		// chunk arrives; `ready` settles then. Until it does, update() renders the
		// empty scene. Resources must exist before the World is constructed:
		// World reads experience.resources.
		this.world = null
		this.ready = loadWorld( world )
			.then( ( entry ) =>
			{
				if ( !entry ) return
				this.resources = new Resources( entry.sources, entry.mode, entry.name )
				this.world = new entry.World()
			})
			.catch( ( error ) =>
			{
				console.error( `Experience: failed to load world "${ world }"`, error )
			})

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
		if ( this.world ) this.world.update()
		this.camera.update()
		this.renderer.update()
	}
}