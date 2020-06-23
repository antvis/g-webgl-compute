export const IDENTIFIER = {
  // SceneGraph
  HierarchyComponentManager: Symbol('HierarchyComponentManager'),
  TransformComponentManager: Symbol('TransformComponentManager'),
  NameComponentManager: Symbol('NameComponentManager'),
  SceneGraphSystem: Symbol('SceneGraphSystem'),

  // Scene
  SceneSystem: Symbol('SceneSystem'),
  SceneComponentManager: Symbol('SceneComponentManager'),

  // Camera
  CameraComponentManager: Symbol('CameraComponentManager'),
  CameraSystem: Symbol('CameraSystem'),

  // FrameGraph
  FrameGraphSystem: Symbol('FrameGraphSystem'),
  ResourceHandleComponentManager: Symbol('ResourceHandleComponentManager'),
  PassNodeComponentManager: Symbol('PassNodeComponentManager'),

  // Interaction
  // InteractionSystem: Symbol('InteractionSystem'),

  // Mesh
  MeshSystem: Symbol('MeshSystem'),
  MeshComponentManager: Symbol('MeshComponentManager'),
  CullableComponentManager: Symbol('CullableComponentManager'),

  // Geometry
  GeometrySystem: Symbol('GeometrySystem'),
  GeometryComponentManager: Symbol('GeometryComponentManager'),

  // Material
  MaterialSystem: Symbol('MaterialSystem'),
  MaterialComponentManager: Symbol('MaterialComponentManager'),

  // RenderPath
  ForwardRenderPath: Symbol('ForwardRenderPath'),

  // ComputeSystem
  ComputeSystem: Symbol('ComputeSystem'),
  ComputeComponentManager: Symbol('ComputeComponentManager'),
  ComputeStrategy: Symbol('ComputeStrategy'),

  Systems: Symbol('Systems'),
  World: Symbol('World'),

  // RenderEngine
  RenderEngine: Symbol('RenderEngine'),
  WebGPUEngine: Symbol('WebGPUEngine'),
  WebGLEngine: Symbol('WebGLEngine'),
};
