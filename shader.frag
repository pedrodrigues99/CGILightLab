precision highp float;

uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transformation for vectors

uniform bool uUseNormals;
varying vec3 fNormal;
varying vec3 fPosition;

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec3 pos;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
    bool isDirectional;
    bool isActive;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used

uniform LightInfo uLight[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial;  // The material of the object being drawn

void main()
{
    vec3 L;
    vec3 globalLight;


    for(int i=0; i<MAX_LIGHTS; i++){

        if(i == uNLights){
            break;
        } else {
            if(uLight[i].isActive){
                
                if(uLight[i].isDirectional)
                    L = normalize((mViewNormals * vec4(uLight[i].pos, 0)).xyz);
                else
                    L = normalize((mView * vec4(uLight[i].pos, 1)).xyz - fPosition);

                vec3 V = normalize(-fPosition);
                vec3 H = normalize(L + V);
                vec3 N = normalize(fNormal);

                vec3 R = reflect(-L, N);

                vec3 ambientColor = uMaterial.Ka * uLight[i].Ia;


                vec3 diffuseColor = uMaterial.Kd * uLight[i].Id;
                float diffuseFactor = max(dot(L, N), 0.0);
                vec3 diffuse = diffuseFactor * diffuseColor;

                vec3 specularColor = uMaterial.Ks * uLight[i].Is;
                float specularFactor = pow(max(dot(R, V), 0.0), uMaterial.shininess);
                vec3 specular = specularFactor * specularColor;

                if(dot(L,N) < 0.0){
                    specular = vec3(0.0, 0.0, 0.0);
                }
                
                globalLight += ambientColor + diffuse + specular;
            }

        }

    }

    gl_FragColor = vec4(globalLight, 1.0);
}