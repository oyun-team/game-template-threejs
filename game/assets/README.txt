Put your models (.glb), textures, sounds and fonts here. Load a model with GLTFLoader:
Modellerini (.glb), dokularını, seslerini buraya koy. Model yüklemek için GLTFLoader kullan:

  // copy node_modules/three/examples/jsm/loaders/GLTFLoader.js (and its imports) into lib/,
  // or download it from https://github.com/mrdoob/three.js/tree/r186/examples/jsm
  import { GLTFLoader } from "./lib/GLTFLoader.js";
  new GLTFLoader().load("assets/robot.glb", (gltf) => scene.add(gltf.scene));
