import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize} from '../../libs/MV.js';
import { modelView, pushMatrix, popMatrix, multScale, multTranslation, loadMatrix} from '../../libs/stack.js';

import * as dat from '../../libs/dat.gui.module.js';

import * as CUBE from '../../libs/cube.js';
import * as SPHERE from '../../libs/sphere.js';
import * as TORUS from '../../libs/torus.js';
import * as PYRAMID from '../../libs/pyramid.js';
import * as CYLINDER from '../../libs/cylinder.js';

import * as STACK from '../../libs/stack.js';

const FLOOR_SIZE = 3;
const FLOOR_THICKNESS = 0.1;
const FLOOR_YPOS = -0.05;
const OBJ_YPOS = 0.5;

const LIGHT_SIZE = 0.05;

const MAX_LIGHTS = 8;

let lightArray = [];
let l = 0;

function setup(shaders) {
    const canvas = document.getElementById('gl-canvas');
    const gl = setupWebGL(canvas);

    CUBE.init(gl);
    SPHERE.init(gl);
    TORUS.init(gl);
    PYRAMID.init(gl);
    CYLINDER.init(gl);

    const program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);
    const lightProgram = buildProgramFromSources(gl, shaders['shaderLight.vert'], shaders['shaderLight.frag']);
    
    let mode = gl.TRIANGLES;

    // Camera  
    let camera = {
        eye: vec3(0,3,5),
        at: vec3(0,0,0),
        up: vec3(0,1,0),
        fovy: 45,
        aspect: 1, // Updated further down
        near: 0.1,
        far: 20
    }

    let options = {
        "normals": true,
        "wireframe": true,
        "backface culling": true,
        "depth buffer": true,
        "show lights": true
    }

    let materials = {
        Ka: [0, 25, 0],
        Kd: [0, 100, 0],
        Ks: [255, 255, 255],
        shininess: 50
    }

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "backface culling");
    optionsGui.add(options, "depth buffer");
    optionsGui.add(options, "show lights");

    const cameraGui = gui.addFolder("camera");

    cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();
    
    cameraGui.add(camera, "near").min(0.1).max(20).onChange( function(v) {
        camera.near = Math.min(camera.far-0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(20).listen().onChange( function(v) {
        camera.far = Math.max(camera.near+0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).name("x");//.domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 1).step(0.05).name("y");//.domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 2).step(0.05).name("z");//.domElement.style.pointerEvents = "none";;

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).name("x");//.domElement.style.pointerEvents = "none";;
    at.add(camera.at, 1).step(0.05).name("y");//.domElement.style.pointerEvents = "none";;
    at.add(camera.at, 2).step(0.05).name("z");//.domElement.style.pointerEvents = "none";;

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).name("x");//.domElement.style.pointerEvents = "none";;
    up.add(camera.up, 1).step(0.05).name("y");//.domElement.style.pointerEvents = "none";;
    up.add(camera.up, 2).step(0.05).name("z");//.domElement.style.pointerEvents = "none";;

    const gui2 = new dat.GUI();

    var text = {
        object: "Torus"
    }
    
    gui2.add(text, "object", ['Cube', 'Sphere', 'Cylinder', 'Pyramid', 'Torus']).listen();

    const material = gui2.addFolder("material");

    material.addColor(materials, "Ka");
    material.addColor(materials, "Kd");
    material.addColor(materials, "Ks");
    material.add(materials, "shininess").min(1).listen();

    const lightsGui = gui.addFolder("lights");
    
    function addLight(){
        if(l < MAX_LIGHTS){
            let settings = {
                pos: vec3(getRndInteger(-2, 2), getRndInteger(0, 2), getRndInteger(-2, 2)),
                ambient: [75, 75, 75],
                diffuse: [175, 175, 175],
                specular: [255, 255, 255],
                directional: false,
                active: true
            }
                
            lightArray.push(settings);

            const light = lightsGui.addFolder("light" + (l + 1));

            light.add(lightArray[l].pos, 0).step(0.05).listen().name("x");
            light.add(lightArray[l].pos, 1).step(0.05).listen().name("y");
            light.add(lightArray[l].pos, 2).step(0.05).listen().name("z");
            light.addColor(lightArray[l], "ambient");
            light.addColor(lightArray[l], "diffuse");
            light.addColor(lightArray[l], "specular");
            light.add(lightArray[l], "directional");
            light.add(lightArray[l], "active");

            l++;
        }
    };

    document.onkeydown = function(event){
        switch(event.key){
            case ' ':
                addLight();
                break;
        }
    }

    // matrices
    let mView, mProjection;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    resizeCanvasToFullWindow();

    window.addEventListener('resize', resizeCanvasToFullWindow);

    window.addEventListener('wheel', function(event) {
        const factor = 1 - event.deltaY/1000;
        camera.fovy = Math.max(1, Math.min(100, camera.fovy * factor)); 
    });

    window.requestAnimationFrame(render);

    function lights(){
        for(let i = 0; i < lightArray.length; i++){
            if(options['show lights'] && lightArray[i].active){
                pushMatrix();
                    STACK.multTranslation([lightArray[i].pos[0], lightArray[i].pos[1], lightArray[i].pos[2]]);
                    gl.uniform3fv(gl.getUniformLocation(lightProgram, "fNormal"), scale(1/255, lightArray[i].specular));
                    light();
                popMatrix();
            }
        }
    }

    function objects(){
        switch(text.object){
            case 'Cube':
                cube();
                break;
            case 'Sphere':
                sphere();
                break;
            case 'Cylinder':
                cylinder();
                break;
            case 'Pyramid':
                pyramid();
                break;
            case 'Torus':
                torus();
                break;
        }
    }

    function cube(){
        STACK.multTranslation([0, OBJ_YPOS, 0]);

        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function sphere(){
        STACK.multTranslation([0, OBJ_YPOS, 0]);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function cylinder(){
        STACK.multTranslation([0, OBJ_YPOS, 0]);

        uploadModelView();

        CYLINDER.draw(gl, program, mode);
    }

    function pyramid(){
        STACK.multTranslation([0, OBJ_YPOS, 0]);

        uploadModelView();

        PYRAMID.draw(gl, program, mode);
    }

    function torus(){
        STACK.multTranslation([0, OBJ_YPOS, 0]);

        uploadModelView();

        TORUS.draw(gl, program, mode);
    }
    
    function floor(){
        STACK.multTranslation([0, FLOOR_YPOS, 0]);

        STACK.multScale([FLOOR_SIZE, FLOOR_THICKNESS, FLOOR_SIZE]);

        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    
    function light(){
        STACK.multScale([LIGHT_SIZE, LIGHT_SIZE, LIGHT_SIZE]);

        uploadModelViewLight();

        SPHERE.draw(gl, lightProgram, options.wireframe);
    }

    function uploadModelViewLight(){

        gl.uniformMatrix4fv(gl.getUniformLocation(lightProgram, "mModelView"), false, flatten(modelView()));
    }

    function getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1) ) + min;
    }

    function resizeCanvasToFullWindow()
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        camera.aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
    }

    addLight();

    function render(time)
    {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        mView = lookAt(camera.eye, camera.at, camera.up);
        loadMatrix(mView);

        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);


        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(STACK.modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(STACK.modelView())));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mView"), false, flatten(mView));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mViewNormals"), false, flatten(normalMatrix(mView)));

        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), scale(1/255, materials.Ka));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), scale(1/255, materials.Kd));        
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), scale(1/255, materials.Ks));
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), materials.shininess);

        for(let k = 0; k < lightArray.length; k++){
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + k + "].pos"), lightArray[k].pos);
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + k + "].Ia"), scale(1/255, lightArray[k].ambient));
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + k + "].Id"), scale(1/255, lightArray[k].diffuse));
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + k + "].Is"), scale(1/255, lightArray[k].specular));
            gl.uniform1i(gl.getUniformLocation(program, "uLight[" + k + "].isDirectional"), lightArray[k].directional? 1 : 0);
            gl.uniform1i(gl.getUniformLocation(program, "uLight[" + k + "].isActive"), lightArray[k].active? 1 : 0);
        }

        gl.uniform1i(gl.getUniformLocation(program, "uNLights"), lightArray.length);

        gl.uniform1i(gl.getUniformLocation(program, "uUseNormals"), options.normals);
        
        gl.useProgram(lightProgram);

        gl.uniformMatrix4fv(gl.getUniformLocation(lightProgram, "mModelView"), false, flatten(STACK.modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(lightProgram, "mProjection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(lightProgram, "mNormals"), false, flatten(normalMatrix(STACK.modelView())));

        gl.uniform1i(gl.getUniformLocation(lightProgram, "uNLights"), lightArray.length);

        gl.useProgram(program);

        options["backface culling"] ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
        options["depth buffer"] ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);


        pushMatrix();
            floor();
        popMatrix();

        pushMatrix();
            objects();
        popMatrix();
        
        gl.useProgram(lightProgram);

        lights();
        
        gl.useProgram(program);
    }
}

const urls = ['shader.vert', 'shader.frag', 'shaderLight.vert', 'shaderLight.frag'];

loadShadersFromURLS(urls).then( shaders => setup(shaders));