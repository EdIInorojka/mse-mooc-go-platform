import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { createGroup, createInvite, fetchTeacherGroups } from '../../api/services/groups';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import type { StudentGroup } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство преподавателя',
    title: 'Учебные группы',
    description: 'Создание когорт, раздача invite-ссылок и обзор прогресса студентов.',
    newGroupName: 'Название новой группы',
    courseNumericId: 'Числовой ID курса',
    createGroup: 'Создать группу',
    groups: 'Группы',
    totalMembers: 'Всего участников',
    activeInvites: 'Активные инвайты',
    avgProgress: 'Средний прогресс',
    studentsCreated: 'студентов, создана',
    refreshInvite: 'Обновить инвайт',
    inviteRefreshed: 'Инвайт обновлен',
    inviteLink: 'Invite-ссылка',
    expiresUsed: 'Истекает',
    usedTimes: 'использований',
    progress: 'Прогресс',
    avgGrade: 'Средняя оценка',
  },
  en: {
    eyebrow: 'Teacher space',
    title: 'Student groups',
    description: 'Create cohorts, share invite links, and track student progress.',
    newGroupName: 'New group name',
    courseNumericId: 'Course numeric ID',
    createGroup: 'Create group',
    groups: 'Groups',
    totalMembers: 'Total members',
    activeInvites: 'Active invites',
    avgProgress: 'Avg. progress',
    studentsCreated: 'students, created',
    refreshInvite: 'Refresh invite',
    inviteRefreshed: 'Invite refreshed',
    inviteLink: 'Invite link',
    expiresUsed: 'Expires',
    usedTimes: 'uses',
    progress: 'Progress',
    avgGrade: 'Avg. grade',
  },
} as const;

export function TeacherGroupsPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [groupName, setGroupName] = useState('');
  const [courseId, setCourseId] = useState('1');
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void fetchTeacherGroups(user.id).then(setGroups);
  }, [user?.id]);

  const totalMembers = useMemo(() => groups.reduce((sum, group) => sum + group.memberCount, 0), [groups]);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!groupName.trim()) {
                return;
              }
              void createGroup({ name: groupName, courseId }).then((group) => {
                setGroups((current) => [group, ...current]);
                setGroupName('');
              });
            }}
          >
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder={text.newGroupName}
            />
            <input
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              placeholder={text.courseNumericId}
            />
            <button type="submit" className="primary-button">{text.createGroup}</button>
          </form>
        }
      />

      <section className="stats-grid">
        <article className="stat-card stat-card--highlight">
          <span>{text.groups}</span>
          <strong>{groups.length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.totalMembers}</span>
          <strong>{totalMembers}</strong>
        </article>
        <article className="stat-card">
          <span>{text.activeInvites}</span>
          <strong>{groups.filter((group) => Boolean(group.invite.token)).length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.avgProgress}</span>
          <strong>
            {groups.length
              ? Math.round(
                  groups.reduce(
                    (sum, group) => sum + (group.members.reduce((acc, member) => acc + member.progress, 0) / Math.max(group.members.length, 1)),
                    0,
                  ) / groups.length,
                )
              : 0}%
          </strong>
        </article>
      </section>

      {inviteNotice ? <div className="notice-card">{inviteNotice}</div> : null}

      <section className="stack-xl">
        {groups.map((group) => (
          <article key={group.id} className="detail-card detail-card--accent">
            <div className="split-grid split-grid--header">
              <div>
                <p className="eyebrow">{group.courseTitle}</p>
                <h3>{group.name}</h3>
                <p>{group.memberCount} {text.studentsCreated} {group.createdAt}</p>
              </div>
              <div className="action-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    void createInvite(group.id).then((invite) => {
                      setInviteNotice(`${text.inviteRefreshed}: ${invite.inviteUrl}`);
                    });
                  }}
                >
                  {text.refreshInvite}
                </button>
                <span className="pill pill--open">{group.invite.token}</span>
              </div>
            </div>

            <div className="invite-panel">
              <strong>{text.inviteLink}</strong>
              <span>{group.invite.inviteUrl}</span>
              <small>{text.expiresUsed} {group.invite.expiresAt} · {group.invite.usageCount} {text.usedTimes}</small>
            </div>

            <div className="member-grid">
              {group.members.map((member) => (
                <article key={member.id} className="member-card">
                  <strong>{member.fullName}</strong>
                  <span>{member.email}</span>
                  <div className="member-card__metrics">
                    <span>{text.progress} {member.progress}%</span>
                    <span>{text.avgGrade} {member.averageGrade}</span>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
