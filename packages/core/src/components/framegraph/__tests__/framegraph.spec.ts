import { mat4, quat, vec3 } from 'gl-matrix';
import 'reflect-metadata';
import {
  ComponentManager,
  container,
  createEntity,
  IDENTIFIER,
} from '../../..';
import { FrameGraphHandle } from '../FrameGraphHandle';
import { FrameGraphSystem } from '../System';

interface RenderPassData {
  output: FrameGraphHandle;
  rt: FrameGraphHandle;
}

describe('FrameGraph', () => {
  const frameGraph = container.getNamed<FrameGraphSystem>(
    IDENTIFIER.Systems,
    IDENTIFIER.FrameGraphSystem,
  );

  test('should add input & output resources correctly.', () => {
    const renderPass = frameGraph.addPass<RenderPassData>(
      'RenderPass',
      (fg, passNode, pass) => {
        const rt = fg.createRenderTarget(passNode, 'RT', {
          width: 1,
          height: 1,
        });
        const output = fg.createTexture(passNode, 'color buffer', {
          width: 1,
          height: 1,
        });

        pass.data = {
          output: passNode.write(fg, output),
          rt,
        };
      },
      async () => {
        //
      },
    );

    frameGraph.present(renderPass.data.output);
    frameGraph.compile();

    expect(frameGraph.passNodes[0].refCount).toBe(1);
    expect(frameGraph.passNodes[1].refCount).toBe(1);
  });
});
