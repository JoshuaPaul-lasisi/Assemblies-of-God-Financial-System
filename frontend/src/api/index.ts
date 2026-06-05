import api from './client';
import type { Token, User, Transaction, AllocationRule, DelegationRule, Report, GeneralCouncil, District, Section, LocalChurch } from '../types';

// Auth
export const login = (username: string, password: string) =>
  api.post<Token>('/api/auth/login', { username, password }).then(r => r.data);

export const getMe = () =>
  api.get<User>('/api/auth/me').then(r => r.data);

export const register = (data: any) =>
  api.post<User>('/api/auth/register', data).then(r => r.data);

export const listUsers = () =>
  api.get<User[]>('/api/auth/users').then(r => r.data);

// Dashboard
export const getDashboardStats = () =>
  api.get('/api/dashboard/stats').then(r => r.data);

export const getNotifications = () =>
  api.get('/api/dashboard/notifications').then(r => r.data);

export const markNotificationRead = (id: number) =>
  api.post(`/api/dashboard/notifications/${id}/read`).then(r => r.data);

export const markAllNotificationsRead = () =>
  api.post('/api/dashboard/notifications/read-all').then(r => r.data);

// Hierarchy
export const getHierarchyTree = () =>
  api.get('/api/hierarchy/tree').then(r => r.data);

export const listGeneralCouncils = () =>
  api.get<GeneralCouncil[]>('/api/hierarchy/general-councils').then(r => r.data);

export const createGeneralCouncil = (data: any) =>
  api.post<GeneralCouncil>('/api/hierarchy/general-councils', data).then(r => r.data);

export const updateGeneralCouncil = (id: number, data: any) =>
  api.put<GeneralCouncil>(`/api/hierarchy/general-councils/${id}`, data).then(r => r.data);

export const deleteGeneralCouncil = (id: number) =>
  api.delete(`/api/hierarchy/general-councils/${id}`).then(r => r.data);

export const listDistricts = (gcId?: number) =>
  api.get<District[]>('/api/hierarchy/districts', { params: { gc_id: gcId } }).then(r => r.data);

export const createDistrict = (data: any) =>
  api.post<District>('/api/hierarchy/districts', data).then(r => r.data);

export const updateDistrict = (id: number, data: any) =>
  api.put<District>(`/api/hierarchy/districts/${id}`, data).then(r => r.data);

export const deleteDistrict = (id: number) =>
  api.delete(`/api/hierarchy/districts/${id}`).then(r => r.data);

export const listSections = (districtId?: number) =>
  api.get<Section[]>('/api/hierarchy/sections', { params: { district_id: districtId } }).then(r => r.data);

export const createSection = (data: any) =>
  api.post<Section>('/api/hierarchy/sections', data).then(r => r.data);

export const updateSection = (id: number, data: any) =>
  api.put<Section>(`/api/hierarchy/sections/${id}`, data).then(r => r.data);

export const deleteSection = (id: number) =>
  api.delete(`/api/hierarchy/sections/${id}`).then(r => r.data);

export const listChurches = (sectionId?: number) =>
  api.get<LocalChurch[]>('/api/hierarchy/churches', { params: { section_id: sectionId } }).then(r => r.data);

export const createChurch = (data: any) =>
  api.post<LocalChurch>('/api/hierarchy/churches', data).then(r => r.data);

export const updateChurch = (id: number, data: any) =>
  api.put<LocalChurch>(`/api/hierarchy/churches/${id}`, data).then(r => r.data);

export const deleteChurch = (id: number) =>
  api.delete(`/api/hierarchy/churches/${id}`).then(r => r.data);

// Transactions
export const listTransactions = (params?: any) =>
  api.get<Transaction[]>('/api/transactions', { params }).then(r => r.data);

export const getTransaction = (id: number) =>
  api.get<Transaction>(`/api/transactions/${id}`).then(r => r.data);

export const createTransaction = (data: any) =>
  api.post<Transaction>('/api/transactions', data).then(r => r.data);

export const approveTransaction = (id: number) =>
  api.post<Transaction>(`/api/transactions/${id}/approve`).then(r => r.data);

export const rejectTransaction = (id: number) =>
  api.post<Transaction>(`/api/transactions/${id}/reject`).then(r => r.data);

export const completeTransaction = (id: number) =>
  api.post<Transaction>(`/api/transactions/${id}/complete`).then(r => r.data);

// Allocations
export const listAllocationRules = (level?: string) =>
  api.get<AllocationRule[]>('/api/allocations/rules', { params: { level } }).then(r => r.data);

export const createAllocationRule = (data: any) =>
  api.post<AllocationRule>('/api/allocations/rules', data).then(r => r.data);

export const updateAllocationRule = (id: number, data: any) =>
  api.put<AllocationRule>(`/api/allocations/rules/${id}`, data).then(r => r.data);

export const deleteAllocationRule = (id: number) =>
  api.delete(`/api/allocations/rules/${id}`).then(r => r.data);

export const listDelegationRules = () =>
  api.get<DelegationRule[]>('/api/allocations/delegation-rules').then(r => r.data);

export const createDelegationRule = (data: any) =>
  api.post<DelegationRule>('/api/allocations/delegation-rules', data).then(r => r.data);

export const deleteDelegationRule = (id: number) =>
  api.delete(`/api/allocations/delegation-rules/${id}`).then(r => r.data);

// Reports
export const listReports = () =>
  api.get<Report[]>('/api/reports').then(r => r.data);

export const createReport = (data: any) =>
  api.post<Report>('/api/reports', data).then(r => r.data);

export const getReport = (id: number) =>
  api.get<Report>(`/api/reports/${id}`).then(r => r.data);

export const downloadReport = (id: number) => {
  const token = localStorage.getItem('token');
  window.open(`/api/reports/${id}/download?token=${token}`, '_blank');
};

export const getMonthlySummary = (params?: any) =>
  api.get('/api/reports/summary/monthly', { params }).then(r => r.data);
