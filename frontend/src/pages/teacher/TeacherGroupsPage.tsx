import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { createGroup, createInvite, fetchTeacherGroups } from '../../api/services/groups';
import { useAuth } from '../../auth/AuthContext';
import type { StudentGroup } from '../../types/models';

export function TeacherGroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [groupName, setGroupName] = useState('');
  const [courseId, setCourseId] = useState('course-2');
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
        eyebrow="Teacher space"
        title="Student groups"
        description="Создание когорт, раздача invite-links и обзор прогресса студентов по группам."
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
              placeholder="New group name"
            />
            <input
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              placeholder="Course ID"
            />
            <button type="submit" className="primary-button">Create group</button>
          </form>
        }
      />

      <section className="stats-grid">
        <article className="stat-card stat-card--highlight">
          <span>Groups</span>
          <strong>{groups.length}</strong>
        </article>
        <article className="stat-card">
          <span>Total members</span>
          <strong>{totalMembers}</strong>
        </article>
        <article className="stat-card">
          <span>Active invites</span>
          <strong>{groups.filter((group) => Boolean(group.invite.token)).length}</strong>
        </article>
        <article className="stat-card">
          <span>Avg. progress</span>
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
                <p>{group.memberCount} students, created {group.createdAt}</p>
              </div>
              <div className="action-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    void createInvite(group.id).then((invite) => {
                      setInviteNotice(`Invite refreshed: ${invite.inviteUrl}`);
                    });
                  }}
                >
                  Refresh invite
                </button>
                <span className="pill pill--open">{group.invite.token}</span>
              </div>
            </div>

            <div className="invite-panel">
              <strong>Invite link</strong>
              <span>{group.invite.inviteUrl}</span>
              <small>Expires {group.invite.expiresAt} · used {group.invite.usageCount} times</small>
            </div>

            <div className="member-grid">
              {group.members.map((member) => (
                <article key={member.id} className="member-card">
                  <strong>{member.fullName}</strong>
                  <span>{member.email}</span>
                  <div className="member-card__metrics">
                    <span>Progress {member.progress}%</span>
                    <span>Avg. grade {member.averageGrade}</span>
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

