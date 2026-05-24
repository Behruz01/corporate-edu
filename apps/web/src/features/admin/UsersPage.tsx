import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ADMIN_ROLES,
  type AdminRole,
  type AdminUserStatus,
  createUser,
  fetchUsers,
  updateUserStatus,
} from './admin-api';

export function UsersPage(): JSX.Element {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AdminRole>('EMPLOYEE');
  const [department, setDepartment] = useState('');

  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchUsers });
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      setEmail('');
      setFullName('');
      setDepartment('');
      setRole('EMPLOYEE');
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('messages.saved'));
    },
    onError: () => toast.error(t('messages.failed')),
  });
  const statusMutation = useMutation({
    mutationFn: updateUserStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(t('messages.saved'));
    },
    onError: () => toast.error(t('messages.failed')),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const payload = {
      email: email.trim(),
      fullName: fullName.trim(),
      role,
      ...(department.trim() ? { department: department.trim() } : {}),
    };
    createMutation.mutate(payload);
  }

  function toggleStatus(id: string, current: AdminUserStatus): void {
    statusMutation.mutate({ id, status: current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('users.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('users.subtitle')}</p>
        </div>
        <Button type="button" onClick={() => setShowForm((value) => !value)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('users.create')}
        </Button>
      </header>

      {showForm ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t('users.create')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
              <Field label={t('fields.email')} htmlFor="admin-user-email">
                <Input id="admin-user-email" type="email" value={email} required onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label={t('fields.fullName')} htmlFor="admin-user-name">
                <Input id="admin-user-name" value={fullName} required minLength={2} onChange={(event) => setFullName(event.target.value)} />
              </Field>
              <Field label={t('fields.role')} htmlFor="admin-user-role">
                <select
                  id="admin-user-role"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={role}
                  onChange={(event) => setRole(event.target.value as AdminRole)}
                >
                  {ADMIN_ROLES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('fields.department')} htmlFor="admin-user-department">
                <Input id="admin-user-department" value={department} onChange={(event) => setDepartment(event.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Button type="submit" disabled={createMutation.isPending || !email.trim() || !fullName.trim()}>
                  {createMutation.isPending ? t('actions.saving') : t('actions.save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-lg">
        <CardContent className="p-0">
          {usersQuery.isLoading ? <StateText>{t('states.loading')}</StateText> : null}
          {usersQuery.isError ? <StateText danger>{t('states.error')}</StateText> : null}
          {usersQuery.data ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t('fields.fullName')}</th>
                    <th className="px-4 py-3">{t('fields.email')}</th>
                    <th className="px-4 py-3">{t('fields.role')}</th>
                    <th className="px-4 py-3">{t('fields.department')}</th>
                    <th className="px-4 py-3">{t('fields.status')}</th>
                    <th className="px-4 py-3 text-right">{t('actions.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{user.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">{user.department ?? '-'}</td>
                      <td className="px-4 py-3">{user.status}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={statusMutation.isPending}
                          onClick={() => toggleStatus(user.id, user.status)}
                        >
                          {user.status === 'ACTIVE' ? <UserRoundX className="h-4 w-4" /> : <UserRoundCheck className="h-4 w-4" />}
                          {user.status === 'ACTIVE' ? t('actions.deactivate') : t('actions.activate')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function StateText({ children, danger = false }: { children: string; danger?: boolean }): JSX.Element {
  return <div className={danger ? 'p-6 text-sm text-destructive' : 'p-6 text-sm text-muted-foreground'}>{children}</div>;
}
