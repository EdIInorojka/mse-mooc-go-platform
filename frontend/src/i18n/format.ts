import type { Language } from './I18nContext';
import type { Role } from '../types/models';

export function localeFor(language: Language) {
  return language === 'ru' ? 'ru-RU' : 'en-US';
}

export function roleLabel(role: Role, language: Language) {
  if (language === 'ru') {
    const map: Record<Role, string> = {
      student: 'Студент',
      teacher: 'Преподаватель',
      teacher_assistant: 'Ассистент',
      admin: 'Админ',
    };
    return map[role];
  }

  const map: Record<Role, string> = {
    student: 'Student',
    teacher: 'Teacher',
    teacher_assistant: 'Assistant',
    admin: 'Admin',
  };
  return map[role];
}

export function audienceLabel(audience: string, language: Language) {
  const normalized = audience.toLowerCase();
  if (language === 'ru') {
    if (normalized === 'student') return 'Студенты';
    if (normalized === 'teacher') return 'Преподаватели';
    if (normalized === 'mixed') return 'Смешанная';
    return audience;
  }

  if (normalized === 'student') return 'Students';
  if (normalized === 'teacher') return 'Teachers';
  if (normalized === 'mixed') return 'Mixed';
  return audience;
}

export function enrollmentStatusLabel(status: string, language: Language) {
  const normalized = status.toLowerCase();
  if (language === 'ru') {
    if (normalized === 'open') return 'Открыт';
    if (normalized === 'enrolled') return 'Записан';
    if (normalized === 'waitlist') return 'Лист ожидания';
    if (normalized === 'published') return 'Опубликовано';
    if (normalized === 'draft') return 'Черновик';
    if (normalized === 'active') return 'Активен';
    if (normalized === 'invited') return 'Приглашен';
    if (normalized === 'blocked') return 'Заблокирован';
    return status;
  }

  if (normalized === 'open') return 'Open';
  if (normalized === 'enrolled') return 'Enrolled';
  if (normalized === 'waitlist') return 'Waitlist';
  if (normalized === 'published') return 'Published';
  if (normalized === 'draft') return 'Draft';
  if (normalized === 'active') return 'Active';
  if (normalized === 'invited') return 'Invited';
  if (normalized === 'blocked') return 'Blocked';
  return status;
}
