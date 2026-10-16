import { httpClient } from '../../../core/http/httpClient'
export interface ActivitySchedule { id?: number; dayOfWeek: string; startTime: string; endTime: string }
export interface FacilityActivity { id:number; name:string; description:string|null; category:string; capacity:number; responsibleStaffId:number|null; responsibleName:string|null; status:string; schedules:ActivitySchedule[] }
export type FacilityActivityInput = Omit<FacilityActivity,'id'|'responsibleName'|'schedules'> & { schedules: Omit<ActivitySchedule,'id'>[] }
export const facilityActivityApi={
 list:async(facilityId:number)=>(await httpClient.get<FacilityActivity[]>(`/facilities/${facilityId}/activities`)).data,
 create:async(facilityId:number,input:FacilityActivityInput)=>(await httpClient.post<FacilityActivity>(`/facilities/${facilityId}/activities`,input)).data,
 update:async(facilityId:number,id:number,input:FacilityActivityInput)=>(await httpClient.put<FacilityActivity>(`/facilities/${facilityId}/activities/${id}`,input)).data,
 delete:async(facilityId:number,id:number)=>{await httpClient.delete(`/facilities/${facilityId}/activities/${id}`)},
}
