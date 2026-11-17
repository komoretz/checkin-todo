/**
 * 核心逻辑自测（Node 直接运行）：npm run test
 * 覆盖：每日循环边界、特定日期、完成态排序、进度、表单校验
 */
import assert from 'node:assert/strict'
import {
  TYPE_DAILY,
  TYPE_SPECIFIC,
  draftToFields,
  isTodoActiveOn,
  listForDate,
  progressOf,
  validateDraft,
} from '../src/lib/todos.js'
import { addDays, diffDays, relativeLabel, weekdayOf } from '../src/lib/date.js'
import { applyCheck, checkinKey, isChecked, removeCheckinsOf } from '../src/lib/storage.js'

let passed = 0
const test = (name, fn) => {
  try {
    fn()
    passed++
    console.log('  ✓', name)
  } catch (err) {
    console.error('  ✗', name)
    console.error(err.message)
    process.exitCode = 1
  }
}

/* ---------- 日期工具 ---------- */
console.log('\n日期工具')

test('addDays 跨月 / 跨年', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('diffDays / relativeLabel', () => {
  assert.equal(diffDays('2026-11-17', '2026-11-20'), 3)
  assert.equal(relativeLabel('2026-11-18', '2026-11-17'), '明天')
  assert.equal(relativeLabel('2026-11-17', '2026-11-17'), '今天')
  assert.equal(relativeLabel('2026-12-31', '2026-11-17'), '')
})

test('weekdayOf 2026-11-17 是周二', () => {
  assert.equal(weekdayOf('2026-11-17'), '周二')
})

/* ---------- 每日循环 ---------- */
console.log('\n每日循环')

const daily = {
  id: 'd1',
  title: '喝水',
  type: TYPE_DAILY,
  startDate: '2026-11-10',
  endDate: '2026-11-20',
  specificDate: null,
  createdAt: 1,
}

test('开始日期当天可见（含边界）', () => {
  assert.equal(isTodoActiveOn(daily, '2026-11-10'), true)
})

test('结束日期当天可见（含边界）', () => {
  assert.equal(isTodoActiveOn(daily, '2026-11-20'), true)
})

test('开始前 / 结束后不可见', () => {
  assert.equal(isTodoActiveOn(daily, '2026-11-09'), false)
  assert.equal(isTodoActiveOn(daily, '2026-11-21'), false)
})

test('无结束日期 → 长期有效', () => {
  const forever = { ...daily, endDate: null }
  assert.equal(isTodoActiveOn(forever, '2030-01-01'), true)
})

test('跨越年份仍正确过滤', () => {
  const t = { ...daily, startDate: '2026-12-30', endDate: '2027-01-02' }
  assert.equal(isTodoActiveOn(t, '2027-01-01'), true)
  assert.equal(isTodoActiveOn(t, '2026-12-29'), false)
})

/* ---------- 特定日期 ---------- */
console.log('\n特定日期')

const once = {
  id: 's1',
  title: '体检',
  type: TYPE_SPECIFIC,
  startDate: null,
  endDate: null,
  specificDate: '2026-11-20',
  createdAt: 2,
}

test('只在指定日期出现', () => {
  assert.equal(isTodoActiveOn(once, '2026-11-20'), true)
  assert.equal(isTodoActiveOn(once, '2026-11-19'), false)
  assert.equal(isTodoActiveOn(once, '2026-11-21'), false)
})

/* ---------- 组合 + 排序 ---------- */
console.log('\n组合与排序')

const todos = [daily, once]
test('同一天可同时出现两类待办', () => {
  const ids = listForDate(todos, {}, '2026-11-20').map((e) => e.todo.id)
  assert.deepEqual(ids, ['d1', 's1'])
  assert.equal(listForDate(todos, {}, '2026-11-17').length, 1)
})

test('未完成在前，已完成在后', () => {
  const checkins = applyCheck({}, 'd1', '2026-11-20', true)
  const list = listForDate(todos, checkins, '2026-11-20')
  assert.deepEqual(
    list.map((e) => [e.todo.id, e.completed]),
    [
      ['s1', false],
      ['d1', true],
    ]
  )
})

test('每日循环按天独立打卡', () => {
  const c1 = applyCheck({}, 'd1', '2026-11-17', true)
  assert.equal(isChecked(c1, 'd1', '2026-11-17'), true)
  assert.equal(isChecked(c1, 'd1', '2026-11-18'), false)
})

test('取消勾选会删除记录而不是存 false', () => {
  const on = applyCheck({}, 'd1', '2026-11-17', true)
  const off = applyCheck(on, 'd1', '2026-11-17', false)
  assert.equal(Object.keys(off).length, 0)
  assert.equal(checkinKey('d1', '2026-11-17'), 'd1::2026-11-17')
})

test('删除待办时清理其全部打卡', () => {
  let c = {}
  c = applyCheck(c, 'd1', '2026-11-17', true)
  c = applyCheck(c, 'd1', '2026-11-18', true)
  c = applyCheck(c, 's1', '2026-11-20', true)
  const cleaned = removeCheckinsOf(c, 'd1')
  assert.deepEqual(Object.keys(cleaned), ['s1::2026-11-20'])
})

test('进度统计', () => {
  const p = progressOf([
    { completed: true },
    { completed: false },
    { completed: false },
    { completed: false },
  ])
  assert.deepEqual(p, { total: 4, done: 1, percent: 25 })
  assert.deepEqual(progressOf([]), { total: 0, done: 0, percent: 0 })
})

/* ---------- 表单 ---------- */
console.log('\n表单校验')

test('标题必填', () => {
  assert.equal(validateDraft({ title: '   ', type: TYPE_DAILY, startDate: '2026-11-17' }), '标题不能为空')
})

test('结束日期不能早于开始日期', () => {
  assert.equal(
    validateDraft({ title: 'A', type: TYPE_DAILY, startDate: '2026-11-20', endDate: '2026-11-10' }),
    '结束日期不能早于开始日期'
  )
})

test('特定日期必须选择日期', () => {
  assert.equal(validateDraft({ title: 'A', type: TYPE_SPECIFIC, specificDate: '' }), '请选择日期')
})

test('切换类型时清理无关字段', () => {
  const dailyFields = draftToFields({
    title: ' 读书 ',
    type: TYPE_DAILY,
    startDate: '2026-11-17',
    endDate: '',
    specificDate: '2026-11-17',
    note: ' 30 分钟 ',
  })
  assert.equal(dailyFields.specificDate, null)
  assert.equal(dailyFields.endDate, null)
  assert.equal(dailyFields.title, '读书')
  assert.equal(dailyFields.note, '30 分钟')

  const onceFields = draftToFields({
    title: '体检',
    type: TYPE_SPECIFIC,
    startDate: '2026-11-17',
    endDate: '2026-12-01',
    specificDate: '2026-11-20',
    note: '',
  })
  assert.equal(onceFields.startDate, null)
  assert.equal(onceFields.endDate, null)
  assert.equal(onceFields.specificDate, '2026-11-20')
})

console.log(`\n全部通过：${passed} 项\n`)
