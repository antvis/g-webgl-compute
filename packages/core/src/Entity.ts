export const EMPTY = -1;

let entitySequence = 1;

/**
 * 类似关系型数据库的主键
 * TODO: 自动生成，考虑序列化
 */
export function createEntity() {
  return entitySequence++;
}
