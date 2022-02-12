uniform mat4 mModelView; // model-view transformation
uniform mat4 mNormals; // inverse transpose of modelView
uniform mat4 mProjection;

attribute vec4 vPosition;
attribute vec4 vNormal;

varying vec3 fNormal;
varying vec3 fPosition;

void main() {

    fNormal = (mNormals * vNormal).xyz;

    gl_Position = mProjection * mModelView * vPosition;

}