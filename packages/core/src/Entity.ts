export type Entity = number;

let entitySequence = 0;

/**
 * 类似关系型数据库的主键
 * TODO: 自动生成，考虑序列化
 */
export function createEntity() {
  return entitySequence++;
}
