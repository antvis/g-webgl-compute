import { vec3 } from 'gl-matrix';
import { Mesh } from '../Mesh';

// tslint:disable: variable-name
const top_light_vertices = [
  -2.13,
  5.409224,
  -2.27,
  -2.13,
  5.409224,
  -3.32,
  -3.43,
  5.409224,
  -2.27,
  -3.43,
  5.409224,
  -3.32,
];
const top_light_triangles = [2, 1, 0, 2, 3, 1];

const floor_vertices = [
  -5.496001,
  0.0,
  -5.591999,
  -5.528,
  0.0,
  0.000001,
  -0.000001,
  0.0,
  -5.592,
  0.0,
  0.0,
  0.0,
];
const floor_triangles = [0, 3, 2, 0, 1, 3];

const small_box_vertices = [
  -1.295364,
  -0.0,
  -0.663536,
  -1.295364,
  1.65,
  -0.663536,
  -2.876464,
  1.65,
  -1.135363,
  -2.876464,
  0.0,
  -1.135364,
  -0.823536,
  0.0,
  -2.244637,
  -0.823536,
  1.65,
  -2.244636,
  -2.404637,
  1.65,
  -2.716464,
  -2.404637,
  0.0,
  -2.716464,
];
const small_box_triangles = [
  5,
  0,
  4,
  6,
  1,
  5,
  7,
  2,
  6,
  4,
  3,
  7,
  1,
  3,
  0,
  6,
  4,
  7,
  5,
  1,
  0,
  6,
  2,
  1,
  7,
  3,
  2,
  4,
  0,
  3,
  1,
  2,
  3,
  6,
  5,
  4,
];

const tall_box_vertices = [
  -4.223526,
  0.0,
  -2.47761,
  -4.223526,
  3.3,
  -2.47761,
  -4.71239,
  3.3,
  -4.053527,
  -4.71239,
  0.0,
  -4.053526,
  -2.64761,
  0.0,
  -2.966473,
  -2.64761,
  3.3,
  -2.966474,
  -3.136474,
  3.3,
  -4.54239,
  -3.136474,
  0.0,
  -4.54239,
];
const tall_box_triangles = [
  5,
  0,
  4,
  6,
  1,
  5,
  7,
  2,
  6,
  4,
  3,
  7,
  1,
  3,
  0,
  6,
  4,
  7,
  5,
  1,
  0,
  6,
  2,
  1,
  7,
  3,
  2,
  4,
  0,
  3,
  1,
  2,
  3,
  6,
  5,
  4,
];

const background_vertices = [
  -5.496001,
  0.0,
  -5.591999,
  -0.000001,
  0.0,
  -5.592,
  -0.000001,
  5.488,
  -5.592,
  -5.560001,
  5.488,
  -5.591999,
];
const background_triangles = [2, 0, 1, 2, 3, 0];

const ceilling_vertices = [
  0.0,
  5.488,
  0.0,
  -0.000001,
  5.488,
  -5.592,
  -5.560001,
  5.488,
  -5.591999,
  -5.56,
  5.488,
  0.000001,
];
const ceilling_triangles = [1, 3, 2, 1, 0, 3];

const left_wall_vertices = [
  -5.496001,
  0.0,
  -5.591999,
  -5.528,
  0.0,
  0.000001,
  -5.560001,
  5.488,
  -5.591999,
  -5.56,
  5.488,
  0.000001,
];
const left_wall_triangles = [2, 1, 0, 2, 3, 1];

const right_wall_vertices = [
  -0.000001,
  0.0,
  -5.592,
  0.0,
  0.0,
  0.0,
  0.0,
  5.488,
  0.0,
  -0.000001,
  5.488,
  -5.592,
];
const right_wall_triangles = [2, 0, 1, 2, 3, 0];

const light = new Mesh('light', top_light_vertices, top_light_triangles);
const floor = new Mesh('floor', floor_vertices, floor_triangles);
const small_box = new Mesh(
  'small_box',
  small_box_vertices,
  small_box_triangles,
);
const tall_box = new Mesh('tall_box', tall_box_vertices, tall_box_triangles);
const ceilling = new Mesh('ceilling', ceilling_vertices, ceilling_triangles);
const background = new Mesh(
  'background',
  background_vertices,
  background_triangles,
);
const left_wall = new Mesh(
  'left_wall',
  left_wall_vertices,
  left_wall_triangles,
);
const right_wall = new Mesh(
  'right_wall',
  right_wall_vertices,
  right_wall_triangles,
);

left_wall.diffuseColor = vec3.fromValues(0.5, 0.0, 0.0);
right_wall.diffuseColor = vec3.fromValues(0.0, 0.5, 0.0);
light.emission = vec3.fromValues(1.0, 1.0, 1.0);
light.diffuseColor = vec3.fromValues(0.0, 0.0, 0.0);

export const cornellBoxScene = [
  light,
  floor,
  small_box,
  tall_box,
  ceilling,
  background,
  left_wall,
  right_wall,
];
