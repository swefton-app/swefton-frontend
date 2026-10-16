import { config } from '../../../config'
import { httpClient } from '../../../core/http/httpClient'

export type PostAuthorType = 'TRAINER' | 'FACILITY'
export interface PostMedia { id: number; type: 'IMAGE' | 'VIDEO'; url: string; originalName: string; position: number }
export interface SocialPost { id: number; authorType: PostAuthorType; authorId: number; authorName: string; authorImageUrl: string | null; facilityId: number | null; text: string | null; media: PostMedia[]; likeCount: number; commentCount: number; likedByMe: boolean; manageableByMe: boolean; createdAt: string; updatedAt: string }
export interface PostComment { id: number; userId: number; authorName: string; text: string; createdAt: string; updatedAt: string }
export interface PostPage { items: SocialPost[]; nextCreatedAt: string | null; nextId: number | null }
export interface CreatePostInput { text?: string; facilityId?: number; imageIds: number[]; videoIds: number[] }

function mediaUrl(url: string) {
  if (/^(?:blob:|data:|https?:\/\/)/i.test(url)) return url
  if (/^https?:\/\//i.test(config.apiUrl)) return new URL(url, new URL(config.apiUrl).origin).toString()
  return url
}

function normalize(post: SocialPost): SocialPost {
  return { ...post, authorImageUrl: post.authorImageUrl ? mediaUrl(post.authorImageUrl) : null, media: [...post.media].sort((a, b) => a.position - b.position).map((item) => ({
    ...item,
    type: item.type ?? (item as PostMedia & { kind?: 'IMAGE' | 'VIDEO' }).kind ?? 'IMAGE',
    url: mediaUrl(item.url),
  })) }
}

export const postApi = {
  async feed(params: { facilityId?: number; authorType?: PostAuthorType; mine?: boolean; cursorCreatedAt?: string; cursorId?: number }) {
    const { data } = await httpClient.get<PostPage>('/posts', { params: { ...params, size: 10 } })
    return { ...data, items: data.items.map(normalize) }
  },
  async create(payload: CreatePostInput) {
    const { data } = await httpClient.post<SocialPost>('/posts', payload)
    return normalize(data)
  },
  async update(id: number, text: string) {
    const { data } = await httpClient.put<SocialPost>(`/posts/${id}`, { text })
    return normalize(data)
  },
  async delete(id: number) { await httpClient.delete(`/posts/${id}`) },
  async like(id: number, liked: boolean) { await httpClient.request({ method: liked ? 'delete' : 'put', url: `/posts/${id}/like` }) },
  async comments(id: number) { return (await httpClient.get<PostComment[]>(`/posts/${id}/comments`)).data },
  async comment(id: number, text: string) { return (await httpClient.post<PostComment>(`/posts/${id}/comments`, { text })).data },
  async uploadImage(file: File, position: number) {
    const form = new FormData(); form.append('file', file); form.append('image', new Blob([JSON.stringify({ type: 'GALLERY', position })], { type: 'application/json' }))
    return (await httpClient.post<{ id: number }>('/images', form)).data
  },
  async uploadVideo(file: File) {
    const form = new FormData(); form.append('file', file)
    return (await httpClient.post<{ id: number }>('/videos', form, { timeout: 120_000 })).data
  },
}
