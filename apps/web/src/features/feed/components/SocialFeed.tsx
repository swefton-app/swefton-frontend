import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, ChevronLeft, ChevronRight, Heart, ImagePlus, LoaderCircle, MessageCircle, Pencil, Play, Plus, Send, Trash2, X } from 'lucide-react'
import { getApiErrorMessage } from '../../../core/http/getApiErrorMessage'
import { tokenStorage } from '../../../core/storage/tokenStorage'
import { postApi, type PostAuthorType, type PostComment, type SocialPost } from '../api/postApi'
import styles from './SocialFeed.module.css'

interface Props { facilityId?: number; composerFacilityId?: number; mine?: boolean; showFilters?: boolean; theme?: 'dark' | 'light'; showAddButton?: boolean; openComposerSignal?: number }

function timeAgo(value: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const units = [
    { seconds: 365 * 24 * 60 * 60, label: 'year' },
    { seconds: 30 * 24 * 60 * 60, label: 'month' },
    { seconds: 7 * 24 * 60 * 60, label: 'week' },
    { seconds: 24 * 60 * 60, label: 'day' },
    { seconds: 60 * 60, label: 'hour' },
    { seconds: 60, label: 'min' },
  ]
  const unit = units.find((item) => seconds >= item.seconds) ?? units.at(-1)!
  const amount = Math.floor(seconds / unit.seconds)
  return `${amount} ${unit.label}${amount === 1 || unit.label === 'min' ? '' : 's'} ago`
}

export function SocialFeed({ facilityId, composerFacilityId, mine = false, showFilters = true, theme = 'dark', showAddButton = true, openComposerSignal = 0 }: Props) {
  const role = tokenStorage.getRole()
  const canPublish = role === 'TRAINER' || (role === 'FACILITY_OWNER' && composerFacilityId != null)
  const canInteract = role === 'USER'
  const [filter, setFilter] = useState<PostAuthorType | undefined>()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [cursor, setCursor] = useState<{ cursorCreatedAt: string; cursorId: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [publishing, setPublishing] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const lastComposerSignal = useRef(openComposerSignal)

  useEffect(() => {
    if (openComposerSignal > lastComposerSignal.current) setComposerOpen(true)
    lastComposerSignal.current = openComposerSignal
  }, [openComposerSignal])

  const load = useCallback(async (append = false) => {
    append ? setLoadingMore(true) : setLoading(true); setError('')
    try {
      const page = await postApi.feed({ facilityId, authorType: filter, mine: mine || undefined, ...(append && cursor ? cursor : {}) })
      setPosts((current) => append ? [...current, ...page.items] : page.items)
      setCursor(page.nextCreatedAt && page.nextId ? { cursorCreatedAt: page.nextCreatedAt, cursorId: page.nextId } : null)
    } catch (reason) { setError(getApiErrorMessage(reason, 'The feed could not be loaded.')) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [cursor, facilityId, filter, mine])

  useEffect(() => { void load(false) }, [facilityId, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const publish = async () => {
    if (!text.trim() && !images.length && !videos.length) return setError('Add text, an image, or a video before publishing.')
    setPublishing(true); setError('')
    try {
      const uploadedImages = await Promise.all(images.map((file, index) => postApi.uploadImage(file, index)))
      const uploadedVideos = await Promise.all(videos.map((file) => postApi.uploadVideo(file)))
      const post = await postApi.create({ text: text.trim() || undefined, facilityId: composerFacilityId, imageIds: uploadedImages.map((item) => item.id), videoIds: uploadedVideos.map((item) => item.id) })
      setPosts((current) => [post, ...current]); setText(''); setImages([]); setVideos([]); setComposerOpen(false)
    } catch (reason) { setError(getApiErrorMessage(reason, 'Your post could not be published.')) }
    finally { setPublishing(false) }
  }

  const chooseFromGallery = (files: FileList | null) => {
    if (!files?.length) return
    const selected = Array.from(files)
    const selectedImages = selected.filter((file) => file.type.startsWith('image/'))
    const selectedVideos = selected.filter((file) => file.type.startsWith('video/'))
    if (selectedImages.length > 10 || selectedVideos.length > 10) {
      setError('Choose up to 10 images and 10 videos for each post.')
    }
    setImages(selectedImages.slice(0, 10))
    setVideos(selectedVideos.slice(0, 10))
  }

  const captureMedia = (file: File | undefined) => {
    if (!file) return
    setError('')
    if (file.type.startsWith('image/')) {
      if (images.length >= 10) return setError('A post can contain up to 10 images.')
      setImages((current) => [...current, file])
    } else if (file.type.startsWith('video/')) {
      if (videos.length >= 10) return setError('A post can contain up to 10 videos.')
      setVideos((current) => [...current, file])
    }
  }

  const previews = useMemo(() => [
    ...images.map((file, index) => ({ file, index, type: 'IMAGE' as const, url: URL.createObjectURL(file) })),
    ...videos.map((file, index) => ({ file, index, type: 'VIDEO' as const, url: URL.createObjectURL(file) })),
  ], [images, videos])

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews])

  const toggleLike = async (post: SocialPost) => {
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likedByMe: !item.likedByMe, likeCount: item.likeCount + (item.likedByMe ? -1 : 1) } : item))
    try { await postApi.like(post.id, post.likedByMe) } catch (reason) { setError(getApiErrorMessage(reason, 'Like could not be updated.')); void load(false) }
  }

  return <section className={`${styles.feed} ${theme === 'light' ? styles.light : ''}`} aria-label="Social feed">
    <div className={styles.heading}><div><span>SWEFTON SOCIAL</span><h2>Move. Share. Inspire.</h2></div>
      <div className={styles.headingActions}>{showFilters && <div className={styles.filters}>{([undefined, 'TRAINER', 'FACILITY'] as const).map((value) => <button key={value ?? 'ALL'} className={filter === value ? styles.activeFilter : undefined} onClick={() => setFilter(value)}>{value === 'TRAINER' ? 'Trainers' : value === 'FACILITY' ? 'Facilities' : 'All'}</button>)}</div>}{canPublish && showAddButton && <button className={styles.addPost} onClick={() => setComposerOpen((open) => !open)}>{composerOpen ? <X /> : <Plus />}{composerOpen ? 'Close' : 'Add post'}</button>}</div>
    </div>
    {canPublish && composerOpen && <div className={styles.composer}>
      <textarea maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder={composerFacilityId ? 'Share what is happening at your facility…' : 'Share a training tip, result, or moment…'} />
      {previews.length > 0 && <div className={styles.previewGrid}>{previews.map((preview) => <div className={styles.preview} key={`${preview.type}-${preview.index}-${preview.file.name}-${preview.file.size}`}>{preview.type === 'IMAGE' ? <img src={preview.url} alt="Selected post media" /> : <video src={preview.url} muted controls preload="metadata" />}<button type="button" onClick={() => preview.type === 'IMAGE' ? setImages((current) => current.filter((_, index) => index !== preview.index)) : setVideos((current) => current.filter((_, index) => index !== preview.index))} aria-label="Remove media"><X /></button>{preview.type === 'VIDEO' && <span><Play /> Video</span>}</div>)}</div>}
      <div className={styles.composeActions}><div>
        <label><ImagePlus /> Choose from gallery<input type="file" accept="image/*,video/*" multiple onChange={(e) => { chooseFromGallery(e.target.files); e.target.value = '' }} /></label>
        <label><Camera /> Take photo or video<input type="file" accept="image/*,video/*" capture="environment" onChange={(e) => { captureMedia(e.target.files?.[0]); e.target.value = '' }} /></label>
      </div><small>{text.length}/2000 · up to 10 images + 10 videos</small><button className={styles.publish} disabled={publishing} onClick={() => void publish()}>{publishing ? <LoaderCircle className={styles.spin} /> : <Send />} Publish</button></div>
    </div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading ? <div className={styles.state}><LoaderCircle className={styles.spin} /> Loading posts…</div> : posts.length ? <div className={styles.list}>{posts.map((post) => <PostCard key={post.id} post={post} canInteract={canInteract} onLike={() => void toggleLike(post)} onUpdated={(updated) => setPosts((current) => current.map((item) => item.id === updated.id ? updated : item))} onDeleted={() => setPosts((current) => current.filter((item) => item.id !== post.id))} />)}</div> : <div className={styles.state}>No posts yet. The first story starts here.</div>}
    {cursor && <button className={styles.more} disabled={loadingMore} onClick={() => void load(true)}>{loadingMore ? <LoaderCircle className={styles.spin} /> : null} Load more</button>}
  </section>
}

function PostCard({ post, canInteract, onLike, onUpdated, onDeleted }: { post: SocialPost; canInteract: boolean; onLike: () => void; onUpdated: (post: SocialPost) => void; onDeleted: () => void }) {
  const [index, setIndex] = useState(0); const [failedMediaId, setFailedMediaId] = useState<number | null>(null); const [showComments, setShowComments] = useState(false); const [comments, setComments] = useState<PostComment[]>([]); const [comment, setComment] = useState(''); const [editing, setEditing] = useState(false); const [editText, setEditText] = useState(post.text ?? ''); const [managing, setManaging] = useState(false); const [manageError, setManageError] = useState(''); const [now, setNow] = useState(Date.now()); const media = post.media[index]
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer) }, [])
  const openComments = async () => { const next = !showComments; setShowComments(next); if (next && !comments.length) setComments(await postApi.comments(post.id)) }
  const submit = async () => { if (!comment.trim()) return; const saved = await postApi.comment(post.id, comment.trim()); setComments((current) => [...current, saved]); setComment('') }
  const saveEdit = async () => { setManaging(true); setManageError(''); try { onUpdated(await postApi.update(post.id, editText)); setEditing(false) } catch (reason) { setManageError(getApiErrorMessage(reason, 'The post could not be updated.')) } finally { setManaging(false) } }
  const deletePost = async () => { if (!window.confirm('Delete this post? This action will remove it from the feed.')) return; setManaging(true); setManageError(''); try { await postApi.delete(post.id); onDeleted() } catch (reason) { setManageError(getApiErrorMessage(reason, 'The post could not be deleted.')); setManaging(false) } }
  return <article className={styles.card}>
    <header>{post.authorImageUrl ? <img className={styles.avatarImage} src={post.authorImageUrl} alt={`${post.authorName} logo`} /> : <span className={styles.avatar}>{post.authorName.slice(0, 1).toUpperCase()}</span>}<div><strong>{post.authorName}</strong><small title={new Date(post.createdAt).toLocaleString()}>{post.authorType === 'FACILITY' ? 'Facility' : 'Trainer'} · {timeAgo(post.createdAt, now)}{post.updatedAt ? ' · Edited' : ''}</small></div>{post.manageableByMe && <div className={styles.manageActions}><button type="button" disabled={managing} title="Edit post" aria-label="Edit post" onClick={() => { setEditText(post.text ?? ''); setEditing((value) => !value); setManageError('') }}><Pencil /></button><button type="button" disabled={managing} className={styles.deletePost} title="Delete post" aria-label="Delete post" onClick={() => void deletePost()}>{managing ? <LoaderCircle className={styles.spin} /> : <Trash2 />}</button></div>}</header>
    {media && <div className={styles.carousel}><div className={styles.media}>{failedMediaId === media.id ? <div className={styles.mediaError}>This media could not be loaded.</div> : media.type === 'IMAGE' ? <img src={media.url} alt={media.originalName || `${post.authorName} post`} onError={() => setFailedMediaId(media.id)} /> : <video key={media.id} src={media.url} controls autoPlay muted playsInline preload="auto" onError={() => setFailedMediaId(media.id)} />}{post.media.length > 1 && <><button className={styles.previous} onClick={() => { setFailedMediaId(null); setIndex((index - 1 + post.media.length) % post.media.length) }} aria-label="Previous media"><ChevronLeft /></button><button className={styles.next} onClick={() => { setFailedMediaId(null); setIndex((index + 1) % post.media.length) }} aria-label="Next media"><ChevronRight /></button></>}</div>{post.media.length > 1 && <div className={styles.mediaIndicators} aria-label={`Media ${index + 1} of ${post.media.length}`}>{post.media.map((item, itemIndex) => <button type="button" key={item.id} className={itemIndex === index ? styles.activeIndicator : undefined} onClick={() => { setFailedMediaId(null); setIndex(itemIndex) }} aria-label={`Show media ${itemIndex + 1}`} />)}</div>}</div>}
    <div className={styles.cardBody}><div className={styles.socialActions}><button disabled={!canInteract} className={post.likedByMe ? styles.liked : undefined} onClick={onLike}><Heart fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likeCount}</button><button onClick={() => void openComments()}><MessageCircle /> {post.commentCount}</button></div>{editing ? <div className={styles.editBox}><textarea maxLength={2000} value={editText} onChange={(event) => setEditText(event.target.value)} /><div><small>{editText.length}/2000</small><button type="button" onClick={() => setEditing(false)}><X /> Cancel</button><button type="button" disabled={managing} onClick={() => void saveEdit()}>{managing ? <LoaderCircle className={styles.spin} /> : <Check />} Save</button></div></div> : post.text && <p><strong>{post.authorName}</strong> {post.text}</p>}{manageError && <p className={styles.inlineError} role="alert">{manageError}</p>}
      {showComments && <div className={styles.comments}>{comments.map((item) => <p key={item.id}><strong>{item.authorName}</strong> {item.text}</p>)}{canInteract && <div className={styles.commentBox}><input maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" /><button onClick={() => void submit()}><Send /></button></div>}</div>}
    </div>
  </article>
}
