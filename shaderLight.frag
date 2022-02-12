precision highp float;

uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transformation for vectors

uniform vec3 fNormal;

void main()
{
    gl_FragColor = vec4(fNormal, 1.0);

}