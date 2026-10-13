"use client";

import { switchDemoUserAction } from "@/app/session-actions";

interface Props {
  users: { id: string; name: string; role: string }[];
  currentId: string;
}

export function UserSwitcher({ users, currentId }: Props) {
  return (
    <form action={switchDemoUserAction} className="switcher">
      <label htmlFor="acting-as" className="muted">Acting as</label>
      <select
        id="acting-as"
        name="userId"
        defaultValue={currentId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
        ))}
      </select>
    </form>
  );
}