import React, { useRef } from "react";
import { View } from "react-native";
import { GLView } from "expo-gl";
import { Renderer, THREE } from "expo-three";
import { GLTFLoader } from "three-stdlib";
import { Asset } from "expo-asset";

type Props = {
  speaking: boolean;
  style?: any;
};

const AVATAR_MODULE = require("../assets/models/avatar.glb");

// --- Final tuned values (from manual testing) ---
const ROTATION_Y = (-45 * Math.PI) / 180; // front-facing, confirmed working
const ZOOM_MARGIN = 1.05;                 // slightly zoomed out from 0.86 so shoulders show
const WAIST_FRACTION = 0.45;              // lower = shows more chest/shoulders, less just-face crop

export default function AvatarViewer({ speaking, style }: Props) {
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  const mixerRef = useRef<any>(null);
  const idleActionRef = useRef<any>(null);
  const talkingActionRef = useRef<any>(null);
  const currentActionRef = useRef<any>(null);

  const onContextCreate = async (gl: any) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const fovDegrees = 35;
    const camera = new THREE.PerspectiveCamera(
      fovDegrees,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.01,
      1000
    );

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(1, 2, 2);
    scene.add(dirLight);

    const loader = new GLTFLoader();

    try {
      const asset = await Asset.fromModule(AVATAR_MODULE).downloadAsync();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(asset.localUri || asset.uri, resolve, undefined, reject);
      });

      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 2.0 / maxDim;
      model.scale.setScalar(scale);
      model.rotation.y = ROTATION_Y;

      const box2 = new THREE.Box3().setFromObject(model);
      const center2 = new THREE.Vector3();
      box2.getCenter(center2);
      model.position.x -= center2.x;
      model.position.y -= box2.min.y;
      model.position.z -= center2.z;

      const box3 = new THREE.Box3().setFromObject(model);
      const topY = box3.max.y;
      const totalHeight = box3.max.y - box3.min.y;
      const waistY = totalHeight * WAIST_FRACTION;
      const visibleSpan = topY - waistY;
      const desiredVisibleHeight = visibleSpan * ZOOM_MARGIN;
      const fovRad = (fovDegrees * Math.PI) / 180;
      const distance = desiredVisibleHeight / (2 * Math.tan(fovRad / 2));
      const cameraY = waistY + visibleSpan / 2;
      camera.position.set(0, cameraY, distance);
      camera.lookAt(0, cameraY, 0);

      scene.add(model);

      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;

      if (gltf.animations?.[0]) {
        idleActionRef.current = mixer.clipAction(gltf.animations[0]);
        idleActionRef.current.play();
        currentActionRef.current = idleActionRef.current;
      }
      if (gltf.animations?.[1]) {
        talkingActionRef.current = mixer.clipAction(gltf.animations[1]);
      }
    } catch (err) {
      console.error("AvatarViewer: failed to load GLB model", err);
    }

    const clock = new THREE.Clock();
    let wasSpeaking = false;

    const render = () => {
      requestAnimationFrame(render);
      const delta = clock.getDelta();

      if (speakingRef.current !== wasSpeaking && idleActionRef.current && talkingActionRef.current) {
        const nextAction = speakingRef.current ? talkingActionRef.current : idleActionRef.current;
        const prevAction = currentActionRef.current;
        if (prevAction && prevAction !== nextAction) {
          nextAction.reset().play();
          prevAction.crossFadeTo(nextAction, 0.3, false);
          currentActionRef.current = nextAction;
        }
        wasSpeaking = speakingRef.current;
      }

      mixerRef.current?.update(delta);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={[{ width: "100%", height: "100%" }, style]}>
      <GLView style={{ width: "100%", height: "100%" }} onContextCreate={onContextCreate} />
    </View>
  );
}
