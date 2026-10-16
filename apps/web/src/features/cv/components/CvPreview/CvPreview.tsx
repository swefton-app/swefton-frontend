import type { CvData, CvTemplate } from '@swefton/shared/cv'
import styles from './CvPreview.module.css'

interface CvPreviewProps {
  data: CvData
  template: CvTemplate
}

function formatMonth(value?: string) {
  if (!value) return ''
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function dateRange(startDate: string, endDate: string | undefined, current: boolean) {
  return `${formatMonth(startDate)} — ${current ? 'Present' : formatMonth(endDate)}`
}

export function CvPreview({ data, template }: CvPreviewProps) {
  const fullName = `${data.firstName} ${data.lastName}`.trim() || 'Your name'
  const hasSidebar = data.skills.length > 0 || data.languages.length > 0

  return (
    <article className={`${styles.page} ${styles[template.toLowerCase()]}`}>
      <header className={styles.header}>
        <h1>{fullName}</h1>
        <p className={styles.title}>{data.professionalTitle || 'Professional title'}</p>
        <div className={styles.contact}>
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.city && <span>{data.city}</span>}
        </div>
      </header>

      <div className={styles.body}>
        {hasSidebar && (
          <aside className={styles.sidebar}>
            {data.skills.length > 0 && (
              <section>
                <h2>Skills</h2>
                <div className={styles.tags}>
                  {data.skills.map((skill) => <span key={skill}>{skill}</span>)}
                </div>
              </section>
            )}
            {data.languages.length > 0 && (
              <section>
                <h2>Languages</h2>
                {data.languages.map((item, index) => (
                  <p className={styles.language} key={`${item.language}-${index}`}>
                    <strong>{item.language || 'Language'}</strong>
                    <span>{item.level.toLowerCase()}</span>
                  </p>
                ))}
              </section>
            )}
          </aside>
        )}

        <main className={styles.main}>
          {data.summary && (
            <section>
              <h2>Profile</h2>
              <p className={styles.copy}>{data.summary}</p>
            </section>
          )}

          {data.experiences.length > 0 && (
            <section>
              <h2>Experience</h2>
              {data.experiences.map((item, index) => (
                <div className={styles.entry} key={`${item.company}-${index}`}>
                  <div className={styles.entryHeading}>
                    <strong>{item.position || 'Position'}</strong>
                    <span>{dateRange(item.startDate, item.endDate, item.current)}</span>
                  </div>
                  <h3>{item.company || 'Company'}</h3>
                  {item.description && <p className={styles.copy}>{item.description}</p>}
                </div>
              ))}
            </section>
          )}

          {data.education.length > 0 && (
            <section>
              <h2>Education</h2>
              {data.education.map((item, index) => (
                <div className={styles.entry} key={`${item.institution}-${index}`}>
                  <div className={styles.entryHeading}>
                    <strong>{item.degree || 'Degree'}</strong>
                    <span>{dateRange(item.startDate, item.endDate, item.current)}</span>
                  </div>
                  <h3>
                    {item.institution || 'Institution'}
                    {item.fieldOfStudy && ` · ${item.fieldOfStudy}`}
                  </h3>
                  {item.description && <p className={styles.copy}>{item.description}</p>}
                </div>
              ))}
            </section>
          )}

          {data.certifications.length > 0 && (
            <section>
              <h2>Certifications</h2>
              {data.certifications.map((item, index) => (
                <div className={styles.entry} key={`${item.name}-${index}`}>
                  <div className={styles.entryHeading}>
                    <strong>{item.name || 'Certification'}</strong>
                    <span>{formatMonth(item.issueDate)}</span>
                  </div>
                  {item.issuer && <h3>{item.issuer}</h3>}
                </div>
              ))}
            </section>
          )}

          {!data.summary && !data.experiences.length && !data.education.length && !data.certifications.length && (
            <div className={styles.placeholder}>Your CV content will appear here as you work.</div>
          )}
        </main>
      </div>
    </article>
  )
}
