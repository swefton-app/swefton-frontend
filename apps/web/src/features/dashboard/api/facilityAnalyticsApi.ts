import { httpClient } from '../../../core/http/httpClient'

export type AnalyticsBucket = 'DAY' | 'MONTH' | 'YEAR'
export interface AnalyticsPoint { periodStart: string; periodEnd: string; newMembers: number; activeMembers: number; departedMembers: number; uniqueVisitors: number; checkIns: number }
export interface FacilityAnalytics { facilityId: number; from: string; to: string; bucket: AnalyticsBucket; newMembers: number; activeMembers: number; departedMembers: number; uniqueVisitors: number; checkIns: number; averageAttendancePerMember: number; churnRate: number; activeMachines: number; machinesUnderRepair: number; machinesOutOfService: number; series: AnalyticsPoint[] }
export interface HourlyCheckInPoint { date: string; dayOfWeek: string; hourStart: string; hourEnd: string; checkIns: number }
export interface WeeklyCheckIns { facilityId: number; weekStart: string; weekEnd: string; totalCheckIns: number; hours: HourlyCheckInPoint[] }

export const facilityAnalyticsApi = {
  async get(facilityId: number, from: string, to: string, bucket: AnalyticsBucket) {
    return (await httpClient.get<FacilityAnalytics>(`/facilities/${facilityId}/analytics`, { params: { from, to, bucket } })).data
  },
  async getHourlyCheckIns(facilityId: number, weekStart: string) {
    return (await httpClient.get<WeeklyCheckIns>(`/facilities/${facilityId}/analytics/check-ins/hourly`, { params: { weekStart } })).data
  },
}
