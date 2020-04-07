import { mat4, quat, vec3 } from 'gl-matrix';
import 'reflect-metadata';
import {
  ComponentManager,
  container,
  createEntity,
  IDENTIFIER,
  System,
} from '../../..';
import { NameComponent } from '../../scenegraph/NameComponent';
import { PassNodeComponent } from '../PassNodeComponent';
import { ResourceHandleComponent } from '../ResourceHandleComponent';
import { FrameGraphSystem } from '../System';

describe('FrameGraph', () => {
  const systems = container.getAll<System>(IDENTIFIER.Systems);
  const frameGraph = systems.find(
    (s) => s.name === IDENTIFIER.FrameGraphSystem,
  ) as FrameGraphSystem;
  const passNodeManager = container.get<ComponentManager<PassNodeComponent>>(
    IDENTIFIER.PassNodeComponentManager,
  );
  const resourceHandleManager = container.get<
    ComponentManager<ResourceHandleComponent>
  >(IDENTIFIER.ResourceHandleComponentManager);
  const nameManager = container.get<ComponentManager<NameComponent>>(
    IDENTIFIER.NameComponentManager,
  );

  afterEach(() => {
    passNodeManager.clear();
    nameManager.clear();
    resourceHandleManager.clear();
  });

  test('should add input & output resources correctly.', () => {
    const deferredPassEntity = frameGraph.registerPassNode('Deferred', {});
    frameGraph.confirmInput(deferredPassEntity, ['GBuffer1', 'GBuffer2']);
    frameGraph.confirmOutput(deferredPassEntity, ['RT1']);

    const deferredPassComponent = passNodeManager.getComponentByEntity(
      deferredPassEntity,
    );

    expect(nameManager.getComponentByEntity(deferredPassEntity)?.name).toBe(
      'Deferred',
    );

    expect(deferredPassComponent?.inputResources.length).toBe(2);
    expect(deferredPassComponent?.outputResources.length).toBe(1);

    const inputResourceEntity = deferredPassComponent?.inputResources[0];
    expect(nameManager.getComponentByEntity(inputResourceEntity!)?.name).toBe(
      'GBuffer1',
    );
    const inputResourceEntity2 = deferredPassComponent?.inputResources[1];
    expect(nameManager.getComponentByEntity(inputResourceEntity2!)?.name).toBe(
      'GBuffer2',
    );
    const outputResourceEntity = deferredPassComponent?.outputResources[0];
    expect(nameManager.getComponentByEntity(outputResourceEntity!)?.name).toBe(
      'RT1',
    );
  });

  test('should construct a DAG correctly.', () => {
    const deferredPassEntity = frameGraph.registerPassNode('Deferred', {});
    frameGraph.confirmInput(deferredPassEntity, ['GBuffer1', 'GBuffer2']);
    frameGraph.confirmOutput(deferredPassEntity, ['RT1']);

    const postProcessingPassEntity = frameGraph.registerPassNode(
      'PostProcessing',
      {},
    );
    frameGraph.confirmInput(postProcessingPassEntity, ['RT1']);
    frameGraph.confirmOutput(postProcessingPassEntity, ['RT2']);

    // compile DAG
    frameGraph.compile();

    // DeferredPass 被引用次数为 1
    expect(passNodeManager.getComponentByEntity(deferredPassEntity)?.ref).toBe(
      1,
    );
    expect(
      passNodeManager.getComponentByEntity(deferredPassEntity)?.nexts[0],
    ).toBe(postProcessingPassEntity);
    expect(
      passNodeManager.getComponentByEntity(postProcessingPassEntity)?.prevs[0],
    ).toBe(deferredPassEntity);
  });
});
