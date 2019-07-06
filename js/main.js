const T = require('three');
const P = require('postprocessing');
const electron = require('electron');
//const gazejs = require('gazejs');
//let eyeTracker = gazejs.createEyeTracker(gazejs.SR_EYELINK_SDK);

// todo: blur pass only applied after threshold, increases nonlinearly

let scene, camera, renderer, clock,
    video, vidTexture, vidPlane, 
    composer, blurPass, renderPass;

let divergence, toggle;
const width = window.innerWidth;
const height = window.innerHeight;
const ratio = width / height;

let simMode = true;
let gazePosShouldReset = true, gazePosReverse = false;
let leftMap, leftMaterial, leftGeometry, leftCircle;
let rightMap, rightMaterial, rightGeometry, rightCircle;


function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}


function initSim() {
    leftMap = new THREE.TextureLoader().load("res/left.png");
    leftMaterial = new THREE.MeshBasicMaterial({ map: leftMap });
    leftGeometry = new THREE.CircleGeometry(40, 64);
    leftCircle = new THREE.Mesh(leftGeometry, leftMaterial);
    leftCircle.position.x = 0;
    leftCircle.position.y = 0;
    leftCircle.position.z = 1;
    scene.add(leftCircle);

    rightMap = new THREE.TextureLoader().load("res/right.png");
    rightMaterial = new THREE.MeshBasicMaterial({ map: rightMap });
    rightGeometry = new THREE.CircleGeometry(40, 64);
    rightCircle = new THREE.Mesh(rightGeometry, rightMaterial);
    rightCircle.position.x = 0;
    rightCircle.position.y = 0;
    rightCircle.position.z = 1;
    scene.add(rightCircle);
}


function simulate() {
    let rightPos = new THREE.Vector2(rightCircle.position.x, rightCircle.position.y);
    let leftPos = new THREE.Vector2(leftCircle.position.x, leftCircle.position.y);
    let dist = rightPos.distanceTo(leftPos);
    let windowCenter = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    let corner = new THREE.Vector2(window.innerWidth, 0);
    let maxDist = windowCenter.distanceTo(corner);

    if (gazePosShouldReset) {
        let x = getRandomArbitrary(-550, 140);
        let y = getRandomArbitrary(-220, 220);
        leftCircle.position.x = x;
        leftCircle.position.y = y;
        rightCircle.position.x = x;
        rightCircle.position.y = y;
        gazePosShouldReset = false;
    }
    
    if (rightCircle.position.x < width && !gazePosReverse) {
        if (dist < (maxDist / 1.7)) {
            rightCircle.position.x += 5;
        }
        else {
            gazePosReverse = true;
        }
    }
    else {
        gazePosReverse = true;
    }

    if (gazePosReverse && rightCircle.position.x >= leftCircle.position.x) {
        rightCircle.position.x -= 5;

        if (rightCircle.position.x < leftCircle.position.x) {
            gazePosShouldReset = true;
            gazePosReverse = false;
        }
    }
}


const init = () => {
    // Event listener for eye tracker
    /*var listener = {
        onConnect:function(){
            log.info("Library version: "+eyeTracker.getLibraryVersion());
            log.info("Model name: "+eyeTracker.getModelName());
            
            eyeTracker.start();
            console.log("OnConnect");
        },
        onStart:function(){
            console.log("OnStart");
        },
        onStop:function(){
            console.log("OnStop");
        },
        onError:function(error){
            console.log(error);
        },
        onGazeData:function(gazeData){
            console.log(gazeData);
        }
    };
    
    // Attach the event listener and start the eye tracker
    eyeTracker.setListener(listener);
    eyeTracker.connect();*/

    // Set up a THREE.js scene using WebGL
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, ratio, 1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    document.getElementById("webgl").appendChild(renderer.domElement);

    // Create a camera positioned to look at our canvas
    camera.position.x = 0;
    camera.position.y = 1;
    camera.position.z = 550;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Get video element from index.html
    video = document.getElementById("video");
    video.width = width;
    video.height = height;

    // Use video element to create a video texture
    vidTexture = new THREE.VideoTexture(video);
    vidTexture.minFilter = THREE.LinearFilter;
    vidTexture.magFilter = THREE.LinearFilter;
    vidTexture.format = THREE.RGBFormat;

    // Wrap the video texture around a plane (our canvas) and add it to the scene
    vidPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
                              new THREE.MeshBasicMaterial({map: vidTexture}));

    scene.add(vidPlane);
    video.src = "res/eyechart.mp4";
    video.load();
    video.play();

    // Create a postprocessing EffectComposer to setup render pass chain
    composer = new P.EffectComposer(renderer);

    // Add two render passes to the composer: 
    // One with blur, one without.
    blurPass = new P.BlurPass();
    renderPass = new P.RenderPass(scene, camera);
    blurPass.initialize();
    renderPass.initialize();
    composer.addPass(renderPass);
    composer.addPass(blurPass);
    renderPass.enabled = true;
    renderPass.renderToScreen = true;
    blurPass.enabled = false;
    blurPass.renderToScreen = true;
    blurPass.kernelSize = 2;
    blurPass.setResolutionScale(1.00);

    if (simMode) {
        initSim();
    }

    clock = new THREE.Clock();
    toggle = true;

    const render = () => {
        if (simMode) {
            simulate();
        }
        adjustDivergence();
        blurPass.setResolutionScale(divergence);
        if (toggle) {
            if (divergence > 0.5) {
                toggleRenderPass();
                toggle = false;
            }   
        }
        else {
            if (divergence < 0.5) {
                toggleRenderPass();
                toggle = true;
            }
        }
        requestAnimationFrame(render);
        composer.render(clock.getDelta());
    };
    render();
};


function toggleRenderPass() {
    blurPass.enabled = !blurPass.enabled;
    renderPass.renderToScreen = !blurPass.enabled;
}


function getMousePos() {
    let mousePos = electron.screen.getCursorScreenPoint();
    return mousePos;
}


function adjustDivergence() {
    if (simMode) {
        let rightPos = new THREE.Vector2(rightCircle.position.x, rightCircle.position.y);
        let leftPos = new THREE.Vector2(leftCircle.position.x, leftCircle.position.y);
        let dist = rightPos.distanceTo(leftPos);
        let windowCenter = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
        let corner = new THREE.Vector2(0, 0);
        let maxDist = windowCenter.distanceTo(corner);
        divergence = 1.00 - (dist*1.5 / maxDist);
    }
    else {
        let mousePos = getMousePos();
        let target = new THREE.Vector2(mousePos.x, mousePos.y);
        let windowCenter = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
        let dist = windowCenter.distanceTo(target);
        let corner = new THREE.Vector2(window.innerWidth, 0);
        let maxDist = windowCenter.distanceTo(corner);
        divergence = 1.00 - (dist / maxDist);
    }
}


init();

/*setTimeout(function(){
    eyeTracker.release();
},20000);*/