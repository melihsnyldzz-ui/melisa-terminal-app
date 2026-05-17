import type { AppScreen, Permission, PersonnelRole, PersonnelUser } from '../../types';

const rolePermissions: Record<PersonnelRole, Permission[]> = {
  admin: ['sales', 'openDocuments', 'picking', 'review', 'printQueue', 'currencySettings', 'auditLog', 'settings', 'messages', 'qrAlbum', 'dataUpdate'],
  depo: ['sales', 'openDocuments', 'picking', 'printQueue', 'messages', 'qrAlbum'],
  kasa: ['sales', 'openDocuments', 'review', 'printQueue', 'messages', 'qrAlbum'],
};

export const screenPermissions: Partial<Record<AppScreen, Permission>> = {
  salesCustomer: 'sales',
  newSale: 'sales',
  openSaleDrafts: 'openDocuments',
  openDocuments: 'openDocuments',
  picking: 'picking',
  saleReview: 'review',
  failedQueue: 'printQueue',
  currencySettings: 'currencySettings',
  auditLog: 'auditLog',
  settings: 'settings',
  messages: 'messages',
  qrAlbum: 'qrAlbum',
  dataUpdate: 'dataUpdate',
};

export function normalizePersonnelRole(role?: string): PersonnelRole {
  const normalized = String(role || '').trim().toLocaleLowerCase('tr-TR');
  if (normalized === 'admin') return 'admin';
  if (normalized === 'kasa') return 'kasa';
  return 'depo';
}

export function hasPermission(user: PersonnelUser | null, permission: Permission): boolean {
  if (!user) return false;
  const role = normalizePersonnelRole(user.role);
  return rolePermissions[role].includes(permission);
}

export function canOpenScreen(user: PersonnelUser | null, screen: AppScreen): boolean {
  const permission = screenPermissions[screen];
  if (!permission) return true;
  return hasPermission(user, permission);
}
