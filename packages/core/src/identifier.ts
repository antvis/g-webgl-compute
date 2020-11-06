export const IDENTIFIER = {
  // SceneGraph
  HierarchyComponentManager: Symbol('HierarchyComponentManager'),
  TransformComponentManager: Symbol('TransformComponentManager'),
  NameComponentManager: Symbol('NameComponentManager'),
  SceneGraphSystem: Symbol('SceneGraphSystem'),

  // FrameGraph
  FrameGraphSystem: Symbol('FrameGraphSystem'),
  ResourcePool: Symbol('ResourcePool'),
  ResourceHandleComponentManager: Symbol('ResourceHandleComponentManager'),
  PassNodeComponentManager: Symbol('PassNodeComponentManager'),

  // Renderer
  RendererSystem: Symbol('RendererSystem'),
  RenderPass: Symbol('RenderPass'),
  RenderPassFactory: Symbol('Factory<IRenderPass>'),
  Renderable: Symbol('Factory<IRenderPass>'),

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

  // Shader Module
  ShaderModuleService: Symbol('ShaderModuleService'),
  ConfigService: Symbol('ConfigService'),
};
