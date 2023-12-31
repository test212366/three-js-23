import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
 
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'


import map from './download.jpg'
import shape from './shape.glb'

export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0xeeeeee, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.1,
			 1000
		)
 
		this.camera.position.set(0, 0, -6) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)


 
	 

		this.isPlaying = true

		this.gltf.load(shape, gltf => {
			this.mesh = gltf.scene.children[0]
 
			this.addObjects()		 
			this.resize()
			this.render()
			this.setupResize()
			this.addLights()
		})

 
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01)
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height

 


	}


	addObjects() {
		let that = this
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			fragmentShader
		})


		this.mat = new THREE.MeshPhysicalMaterial({
			map: new THREE.TextureLoader().load(map),
			roughness: 0.34,
			metalness: 0.05,
			reflectivity: 0.,
			clearcoat: 0, 
			side: THREE.DoubleSide
		})

		let header = `
		float PI = 3.1415926;
		uniform float time;
 
		varying float vNoise;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

 
float distored_pos(vec3 p) {
	float n = cnoise(p * 1. + vec3(time));
		float noisearea = sin(smoothstep(-1., 1., p.y) * PI);
	vNoise = n * noisearea;
 
	return n * noisearea;
}


float amp = 2.4;

vec3 orthogonal(vec3 n) {
	return normalize(
		abs(n.x) > abs(n.z) ? vec3(-n.y, n.x, 0) : vec3(0., -n.z, n.y)
 	);
}
		`
		
		let computeDist = `
		vec3 displacedposition = position + amp * normal * distored_pos(position);

	vec3 eps = vec3(0.001, 0., 0.);
	vec3 tangent = orthogonal(normal);
	vec3 bitangent = normalize(cross(tangent, normal)); 


	vec3 neigbour1 = position + tangent * 0.0001;
	vec3 neigbour2 =  position + bitangent * 0.0001;


	vec3 displacedN1 = neigbour1 + amp * normal * distored_pos(neigbour1);
	vec3 displacedN2 = neigbour2 + amp * normal * distored_pos(neigbour2);

	vec3 displacedTanget = displacedN1 - displacedposition;
	vec3 displacedBitanget = displacedN2 - displacedposition;



	// vec3 tanget = vec3(0.);
	// vec3 bitangent = vec3(0.);

	vec3 displacemedNormal = normalize(cross(displacedTanget, displacedBitanget)  );
		
		`



		this.mat.onBeforeCompile = (shader) => {
			
			this.material.userData.shader = shader

			this.uniforms = this.material.userData.shader.uniforms
			
			shader.uniforms.time = {
				value: 0
			}
			shader.vertexShader = `${header}${shader.vertexShader}`

			shader.vertexShader = shader.vertexShader.replace(
				`void main() {`,
				`void main() {${computeDist}`
			)
			
			shader.vertexShader = shader.vertexShader.replace(`#include <displacementmap_vertex>`, `transformed = displacedposition;`)

			shader.vertexShader = shader.vertexShader.replace(`#include <defaultnormal_vertex>`, THREE.ShaderChunk.defaultnormal_vertex.replace('vec3 transformedNormal = objectNormal;', 'vec3 transformedNormal = displacemedNormal;'))


			shader.fragmentShader = `varying float vNoise;

			vec3 a = vec3(0.5, 0.5, 0.5);
			vec3 b = vec3(0.5, 0.5, 0.5);
			vec3 c = vec3(1., 1., 1.);

			vec3 d = vec3(0.00, 0.10, 0.20);



			vec3 col(float t){
				return a + b * cos(2. * 3.14 *(c*t+d));
			}


			${shader.fragmentShader}
			`

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <map_fragment>',
				`

			 
				
				diffuseColor.rgb = col(vNoise * 5.);`
			)
		 
		}

		// this.geometry = new THREE.SphereGeometry(1, 162, 162)
		this.geometry = this.mesh.geometry
		this.geometry.computeVertexNormals()
		this.plane = new THREE.Mesh(this.geometry, this.mat)
 
		this.scene.add(this.plane)
 
	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05
		this.material.uniforms.time.value = this.time / 10
		
		
		if(this.uniforms) this.uniforms.time.value = this.time / 10
		 
		//this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)
		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 