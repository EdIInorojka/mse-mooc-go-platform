# Role Model Options for MSE-MOOC

## Option 1: Minimal
- Roles: `student`, `teacher`, `admin`
- Best for: курсовой MVP и быстрая реализация.

Permissions:
- `student`: смотреть курсы, записываться, вступать в группу по invite, смотреть свои оценки.
- `teacher`: создавать и редактировать свои курсы, создавать группы, выдавать invite, выставлять оценки.
- `admin`: полный доступ к пользователям, курсам, группам и системным настройкам.

## Option 2: Balanced (Recommended)
- Roles: `student`, `teacher`, `teacher_assistant`, `admin`
- Best for: учебная платформа с делегированием задач преподавателя.

Permissions:
- `teacher_assistant`: управляет группами и оценками, но не создает/удаляет курсы.
- Остальные роли как в Option 1.

## Option 3: Enterprise
- Roles: `student`, `teacher`, `program_manager`, `content_manager`, `admin`, `auditor`
- Best for: большой вуз с формальными процессами и аудитом.

Permissions:
- `program_manager`: курирует программу и назначает преподавателей.
- `content_manager`: публикация и версионирование контента.
- `auditor`: read-only доступ к отчётам и логам.

## Option 4: Security-Strict
- Roles: `student`, `teacher`, `admin`
- Дополнительно: scope-права на уровне ресурса (course_id/group_id).
- Best for: когда важна строгая модель доступа без роста числа ролей.

## Recommendation for Your Course Project
Рекомендую **Option 1 (Minimal)** прямо сейчас:
- полностью покрывает твои требования (студенты, преподаватели, админ);
- быстрее защитить на курсовой;
- проще объяснить архитектурно;
- уже реализовано в текущем коде backend/frontend.

Если нужно развитие после MVP, делаем апгрейд до Option 2 добавлением `teacher_assistant` без ломки текущей схемы.

## Migration Path from Current State
1. Зафиксировать текущий набор ролей: `student/teacher/admin`.
2. Добавить enum/constraint ролей в БД и валидацию на backend.
3. Включить policy checks на endpoint-ах по ownership (`teacher` только свои курсы/группы).
4. При необходимости добавить `teacher_assistant` как новую роль + расширить guards на frontend.
5. Для enterprise-версии перейти на RBAC + permission matrix в таблицах (`roles`, `permissions`, `role_permissions`).
