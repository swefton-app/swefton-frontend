import {
  cvEndpoints,
  type GenerateCvRequest,
  type GenerateCvResponse,
} from '@swefton/shared/cv'
import { httpClient } from '../../../core/http/httpClient'

export const cvApi = {
  async generate(request: GenerateCvRequest) {
    const { data } = await httpClient.post<GenerateCvResponse>(
      cvEndpoints.generate,
      request,
    )
    return data
  },
}
