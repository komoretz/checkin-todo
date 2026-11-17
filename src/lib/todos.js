/* 待办领域逻辑：类型常量、过滤规则、排序、校验
 *
 * 数据模型
 * Todo {
 *   id: string            // crypto.randomUUID()
 *   title: string         // 必填
 *   type: 'daily' | 'specific'
 *   startDate: string|null    // 每日循环：开始日期（含）
 *   endDate: string|null      // 每日循环：结束日期（含），null 表示长期
 *   specificDate: string|null // 特定日期：仅此一天
 *   note: string
 *   createdAt: number
 * }
 * CheckIn { todoId, date, completed }
 */

import { isChecked } from './storage.js'
import { todayStr } from './date.js'

export const TYPE_DAILY = 'daily'
export const TYPE_SPECIFIC = 'specific'

export const TYPE_LABEL = {
  [TYPE_DAILY]: '每日',
  [TYPE_SPECIFIC]: '单次',
}

export const TYPE_FULL_LABEL = {
  [TYPE_DAILY]: '每日循环',
  [TYPE_SPECIFIC]: '特定日期',
}

/**
 * ★ 核心规则：某个待办在某一天是否应该出现
 * @param {object} todo
 * @param {string} date 'YYYY-MM-DD'
 */
export function isTodoActiveOn(todo, date) {
  if (!todo || !date) return false

  if (todo.type === TYPE_SPECIFIC) {
    // 特定日期：只在这一天出现
    return todo.specificDate === date
  }

  // 每日循环：startDate <= date <= endDate（两端包含，日期字符串可直接比较）
  if (todo.startDate && date < todo.startDate) return false
  if (todo.endDate && date > todo.endDate) return false
  return true
}

/** 过滤出某天应显示的待办 */
export function filterTodosForDate(todos, date) {
  return todos.filter((t) => isTodoActiveOn(t, date))
}

/**
 * 组合展示数据：过滤 + 完成态 + 排序
 * 排序规则：未完成在前、已完成在后；组内按创建时间升序（新添加的排后面）
 * @returns {{todo: object, completed: boolean}[]}
 */
export function listForDate(todos, checkins, date) {
  return filterTodosForDate(todos, date)
    .map((todo) => ({ todo, completed: isChecked(checkins, todo.id, date) }))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return (a.todo.createdAt || 0) - (b.todo.createdAt || 0)
    })
}

/** 进度统计 */
export function progressOf(entries) {
  const total = entries.length
  const done = entries.reduce((n, e) => n + (e.completed ? 1 : 0), 0)
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** 生成空白表单值 */
export function emptyDraft(date = todayStr()) {
  return {
    title: '',
    type: TYPE_DAILY,
    startDate: date,
    endDate: '',
    specificDate: date,
    note: '',
  }
}

/** Todo -> 表单值 */
export function toDraft(todo) {
  return {
    title: todo.title ?? '',
    type: todo.type ?? TYPE_DAILY,
    startDate: todo.startDate ?? '',
    endDate: todo.endDate ?? '',
    specificDate: todo.specificDate ?? todayStr(),
    note: todo.note ?? '',
  }
}

/** 校验表单，返回错误信息或空字符串 */
export function validateDraft(draft) {
  const title = (draft.title || '').trim()
  if (!title) return '标题不能为空'
  if (title.length > 60) return '标题最多 60 个字'

  if (draft.type === TYPE_SPECIFIC) {
    if (!draft.specificDate) return '请选择日期'
    return ''
  }

  if (!draft.startDate) return '请选择开始日期'
  if (draft.endDate && draft.endDate < draft.startDate) return '结束日期不能早于开始日期'
  return ''
}

/** 表单值 -> 持久化字段 */
export function draftToFields(draft) {
  const isDaily = draft.type === TYPE_DAILY
  return {
    title: draft.title.trim(),
    type: draft.type,
    startDate: isDaily ? draft.startDate : null,
    endDate: isDaily && draft.endDate ? draft.endDate : null,
    specificDate: isDaily ? null : draft.specificDate,
    note: (draft.note || '').trim(),
  }
}

/** 描述待办的日程范围，用于列表副标题 */
export function describeSchedule(todo) {
  if (todo.type === TYPE_SPECIFIC) return `${todo.specificDate || ''} 单次`
  if (todo.endDate) return `${todo.startDate} 至 ${todo.endDate}`
  return `${todo.startDate || ''} 起 · 长期`
}
