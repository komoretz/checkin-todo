import TodoItem from './TodoItem'
import EmptyState from './EmptyState'

/** 列表：未完成在前，已完成折叠在后 */
export default function TodoList({ entries, date, isToday, onToggle, onEdit }) {
  if (entries.length === 0) return <EmptyState date={date} isToday={isToday} />

  const pending = entries.filter((e) => !e.completed)
  const done = entries.filter((e) => e.completed)

  return (
    <div className="lists">
      {pending.length > 0 ? (
        <ul className="todo-list">
          {pending.map(({ todo, completed }) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              date={date}
              completed={completed}
              onToggle={(next) => onToggle(todo.id, next)}
              onEdit={() => onEdit(todo)}
            />
          ))}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <section className="done-section" aria-label="已完成的待办">
          <div className="section-label">
            已完成 <span className="section-count">{done.length}</span>
          </div>
          <ul className="todo-list">
            {done.map(({ todo, completed }) => (
              <TodoItem
                key={todo.id}
                todo={todo}
              date={date}
                completed={completed}
                onToggle={(next) => onToggle(todo.id, next)}
                onEdit={() => onEdit(todo)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
