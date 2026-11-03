export const errorDefinitions = {
  'K1-SYS-000': { status: 500, message: '服务内部错误', level: 'error' },
  'K1-REQ-001': { status: 400, message: '请求体不是合法 JSON', level: 'warn' },
  'K1-REQ-002': { status: 400, message: '路径或查询参数格式错误', level: 'warn' },
  'K1-AUTH-001': { status: 401, message: '未登录或会话失效', level: 'warn' },
  'K1-AUTH-002': { status: 403, message: '权限不足', level: 'warn' },
  'K1-AUTH-003': { status: 403, message: 'CSRF 校验失败', level: 'warn' },
  'K1-AUTH-004': { status: 429, message: '登录尝试过多', level: 'warn' },
  'K1-CMT-001': { status: 404, message: '留言目标不存在', level: 'info' },
  'K1-CMT-002': { status: 404, message: '留言不存在', level: 'info' },
  'K1-CMT-003': { status: 422, message: '留言字段非法或超长', level: 'info' },
  'K1-CMT-004': { status: 422, message: '父留言不存在或层级非法', level: 'info' },
  'K1-CMT-005': { status: 422, message: '留言被安全策略拒绝', level: 'info' },
  'K1-CMT-006': { status: 409, message: '留言状态冲突', level: 'warn' },
  'K1-CMT-007': { status: 429, message: '留言提交过于频繁', level: 'warn' },
  'K1-DB-001': { status: 503, message: '数据库不可用', level: 'error' },
  'K1-DB-002': { status: 500, message: '数据写入失败', level: 'error' },
  'K1-SEC-001': { status: 403, message: '请求来源不允许', level: 'warn' },
  'K1-ADM-001': { status: 409, message: '审核状态已被他人变更', level: 'warn' },
} as const;

export type ErrorCode = keyof typeof errorDefinitions;
