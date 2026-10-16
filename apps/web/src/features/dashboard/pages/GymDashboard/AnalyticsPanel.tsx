import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Dumbbell, LoaderCircle, TrendingDown, TrendingUp, UserMinus, UserPlus, UsersRound } from 'lucide-react'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { facilityAnalyticsApi, type AnalyticsBucket, type FacilityAnalytics, type HourlyCheckInPoint, type WeeklyCheckIns } from '../../api/facilityAnalyticsApi'
import styles from './AnalyticsPanel.module.css'
import annualStyles from './AnnualMembersChart.module.css'
import checkInStyles from './HourlyCheckInsChart.module.css'
import growthStyles from './MembershipGrowthChart.module.css'
import filterStyles from './AnalyticsFilters.module.css'

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const today = () => iso(new Date())
const daysAgo = (days: number) => iso(new Date(Date.now() - (days - 1) * 86400000))
const currentYear = new Date().getFullYear()
const addDays = (value: string, days: number) => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate()+days); return iso(date) }
const currentWeekStart = () => { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()-((date.getDay()+6)%7)); return iso(date) }

export function AnalyticsPanel({ facilityId, facilityName }: { facilityId: number; facilityName: string }) {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(today())
  const [bucket, setBucket] = useState<AnalyticsBucket>('DAY')
  const [range, setRange] = useState('30D')
  const [data, setData] = useState<FacilityAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberYear, setMemberYear] = useState(currentYear)
  const [yearlyData, setYearlyData] = useState<FacilityAnalytics | null>(null)
  const [yearlyLoading, setYearlyLoading] = useState(true)
  const [yearlyError, setYearlyError] = useState('')
  const [checkInWeek, setCheckInWeek] = useState(currentWeekStart)
  const [hourlyCheckIns, setHourlyCheckIns] = useState<WeeklyCheckIns | null>(null)
  const [hourlyLoading, setHourlyLoading] = useState(true)
  const [hourlyError, setHourlyError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setData(await facilityAnalyticsApi.get(facilityId, from, to, bucket)) }
    catch (reason) { setError(getApiErrorMessage(reason, 'Analytics could not be loaded.')) }
    finally { setLoading(false) }
  }, [bucket, facilityId, from, to])

  useEffect(() => { void load() }, [load])

  const loadYearlyMembers = useCallback(async () => {
    setYearlyLoading(true)
    setYearlyError('')
    const yearTo = memberYear === currentYear ? today() : `${memberYear}-12-31`
    try { setYearlyData(await facilityAnalyticsApi.get(facilityId, `${memberYear}-01-01`, yearTo, 'MONTH')) }
    catch (reason) { setYearlyError(getApiErrorMessage(reason, 'Yearly member data could not be loaded.')) }
    finally { setYearlyLoading(false) }
  }, [facilityId, memberYear])

  useEffect(() => { void loadYearlyMembers() }, [loadYearlyMembers])

  const loadHourlyCheckIns = useCallback(async () => {
    setHourlyLoading(true)
    setHourlyError('')
    try { setHourlyCheckIns(await facilityAnalyticsApi.getHourlyCheckIns(facilityId, checkInWeek)) }
    catch (reason) { setHourlyCheckIns(null); setHourlyError(getApiErrorMessage(reason, 'Hourly check-ins could not be loaded.')) }
    finally { setHourlyLoading(false) }
  }, [checkInWeek, facilityId])

  useEffect(() => { void loadHourlyCheckIns() }, [loadHourlyCheckIns])

  const selectRange = (value: '7D' | '30D' | '90D' | '1Y') => {
    setRange(value)
    setTo(today())
    setFrom(daysAgo(value === '7D' ? 7 : value === '30D' ? 30 : value === '90D' ? 90 : 365))
    setBucket(value === '1Y' ? 'MONTH' : 'DAY')
  }

  const bucketForRange = (rangeFrom: string, rangeTo: string): AnalyticsBucket => {
    const duration = Math.max(1,(new Date(`${rangeTo}T12:00:00`).getTime()-new Date(`${rangeFrom}T12:00:00`).getTime())/86400000)
    return duration <= 90 ? 'DAY' : duration <= 730 ? 'MONTH' : 'YEAR'
  }

  const metrics = useMemo(() => data ? [
    { label: 'Active members', value: data.activeMembers, helper: 'At the end of this period', icon: UsersRound, tone: 'cyan' },
    { label: 'New members', value: data.newMembers, helper: 'Approved during this period', icon: UserPlus, tone: 'lime' },
    { label: 'Check-ins', value: data.checkIns, helper: 'Total facility entries', icon: TrendingUp, tone: 'purple' },
    { label: 'Average attendance', value: data.averageAttendancePerMember, helper: 'Check-ins per member', icon: CalendarRange, tone: 'blue' },
    { label: 'Departed members', value: data.departedMembers, helper: 'Cancelled or expired', icon: UserMinus, tone: 'pink' },
    { label: 'Churn rate', value: `${data.churnRate}%`, helper: 'Departures vs. starting members', icon: TrendingDown, tone: 'orange' },
  ] : [], [data])

  return <section className={styles.analytics}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><span>FACILITY PERFORMANCE</span><h2>Analytics that make sense.</h2><p>See how {facilityName} is growing, how often members train, and where attention is needed.</p></div>
      <div className={styles.periodSummary}><CalendarDays /><span>Showing</span><strong>{new Date(`${from}T00:00:00`).toLocaleDateString()} to {new Date(`${to}T00:00:00`).toLocaleDateString()}</strong></div>
    </header>

    <div className={`${styles.toolbar} ${filterStyles.toolbar}`}>
      <div className={filterStyles.filterIntro}><CalendarRange/><div><strong>Reporting period</strong><span>Charts update automatically</span></div></div>
      <div className={`${styles.quickRanges} ${filterStyles.periodTabs}`} aria-label="Analytics period">{(['7D','30D','90D','1Y'] as const).map(value => <button type="button" key={value} aria-pressed={range===value} className={range === value ? styles.selectedRange : ''} onClick={() => selectRange(value)}>{value}</button>)}<button type="button" aria-pressed={range==='CUSTOM'} className={range === 'CUSTOM' ? styles.selectedRange : ''} onClick={() => setRange('CUSTOM')}>Custom</button></div>
      {range === 'CUSTOM' && <div className={`${styles.dateControls} ${filterStyles.dateControls}`}><label>From<input required type="date" value={from} max={to} onChange={e => { const value=e.target.value;if(!value)return;setFrom(value);setBucket(bucketForRange(value,to)) }} /></label><label>To<input required type="date" value={to} min={from} max={today()} onChange={e => { const value=e.target.value;if(!value)return;setTo(value);setBucket(bucketForRange(from,value)) }} /></label></div>}
    </div>

    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading ? <div className={styles.loading}><LoaderCircle className={styles.spin} /><strong>Preparing your analytics</strong><span>Calculating memberships, attendance and equipment health.</span></div> : data && <>
      <div className={styles.metrics}>{metrics.map(({ label, value, helper, icon: Icon, tone }) => <article key={label} data-tone={tone}><div><Icon /></div><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>)}</div>
      <article className={`${styles.chartCard} ${annualStyles.annualCard}`}>
        <header className={annualStyles.annualHeader}>
          <div><span>YEARLY MEMBERSHIP</span><h3>Members throughout the year</h3><p>Active members at the end of each month, with yearly growth at a glance.</p></div>
          <label className={annualStyles.yearPicker}>Year<select value={memberYear} onChange={event => setMemberYear(Number(event.target.value))}>{Array.from({ length: 5 }, (_, index) => currentYear - index).map(year => <option key={year} value={year}>{year}</option>)}</select></label>
        </header>
        {yearlyError && <p className={annualStyles.inlineError} role="alert">{yearlyError}</p>}
        {yearlyLoading ? <div className={annualStyles.chartLoading}><LoaderCircle className={styles.spin} />Loading {memberYear} member data...</div> : yearlyData && <AnnualMembersChart data={yearlyData} year={memberYear} />}
      </article>
      <WeeklyCheckInsCard data={hourlyCheckIns} weekStart={checkInWeek} loading={hourlyLoading} error={hourlyError} onWeekChange={setCheckInWeek} />
      <article className={styles.chartCard}><MembershipChartHeader/><MembershipChart data={data} /></article>
      <article className={styles.machineCard}><div className={styles.machineCopy}><span>EQUIPMENT HEALTH</span><h3>Machine availability</h3><p>Quickly identify equipment that needs maintenance.</p></div><MachineChart data={data} /></article>
    </>}
  </section>
}

function MembershipChartHeader() {
  return <header className={styles.chartHeader}><div><span>MEMBERSHIP MOVEMENT</span><h3>Member growth</h3><p>Compare active members with newly approved memberships over time.</p></div><div className={growthStyles.lineLegend}><span><i data-series="active"/>Active</span><span><i data-series="new"/>New</span></div></header>
}

function pointLabels(data: FacilityAnalytics) {
  return data.series.map(point => new Date(`${point.periodStart}T00:00:00`).toLocaleDateString(undefined,
    data.bucket === 'DAY' ? { month: 'short', day: 'numeric' } : data.bucket === 'MONTH' ? { month: 'short', year: '2-digit' } : { year: 'numeric' }))
}

function AnnualMembersChart({ data, year }: { data: FacilityAnalytics; year: number }) {
  const pointsByMonth = new Map(data.series.map(point => [Number(point.periodStart.slice(5, 7)) - 1, point]))
  const months = Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(2020, index, 1)),
    value: pointsByMonth.get(index)?.activeMembers ?? null,
  }))
  const values = months.flatMap(month => month.value === null ? [] : [month.value])
  const latest = values.at(-1) ?? 0
  const peak = Math.max(0, ...values)
  const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  const width = 900, height = 330, left = 52, right = 16, top = 35, bottom = 50
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const { maximum, ticks } = memberChartScale(peak)
  const band = plotWidth / 12, barWidth = Math.min(48, band * .62)
  const y = (value: number) => top + plotHeight - value / maximum * plotHeight

  return <>
    <div className={annualStyles.annualStats}>
      <p><span>Latest active</span><strong>{latest}</strong></p>
      <p><span>New in {year}</span><strong>{data.newMembers}</strong></p>
      <p><span>Monthly average</span><strong>{average}</strong></p>
    </div>
    <div className={styles.chartScroller}>
      <svg className={`${styles.chart} ${annualStyles.annualChart}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Active members by month in ${year}`}>
        <defs><linearGradient id="annualMemberBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b7f43d"/><stop offset="100%" stopColor="#18cfe5"/></linearGradient></defs>
        <g className={styles.gridLines}>{ticks.map(tick => <g key={tick}><line x1={left} x2={width-right} y1={y(tick)} y2={y(tick)}/><text x={left-10} y={y(tick)+4}>{tick}</text></g>)}</g>
        {months.map((month, index) => {
          const x = left + index * band + (band - barWidth) / 2
          return <g key={month.label}>
            {month.value !== null && <>
              <rect className={`${annualStyles.annualBar} ${month.value === peak && peak > 0 ? annualStyles.peakBar : ''}`} x={x} y={y(month.value)} width={barWidth} height={Math.max(3, top+plotHeight-y(month.value))} rx="9"><title>{month.label} {year}: {month.value} active members</title></rect>
              <text className={annualStyles.annualValue} x={x+barWidth/2} y={Math.max(top+13,y(month.value)-8)}>{month.value}</text>
            </>}
            <text className={annualStyles.annualMonth} x={x+barWidth/2} y={height-17}>{month.label}</text>
          </g>
        })}
      </svg>
    </div>
  </>
}

function memberChartScale(peak: number) {
  if (peak <= 10) {
    return { maximum: 10, ticks: Array.from({ length: 11 }, (_, index) => index) }
  }

  let step: number
  if (peak <= 100) step = 10
  else if (peak <= 500) step = 50
  else step = Math.ceil(peak / 500) * 100

  const maximum = Math.max(step, Math.ceil(peak / step) * step)
  return { maximum, ticks: Array.from({ length: maximum / step + 1 }, (_, index) => index * step) }
}

function WeeklyCheckInsCard({ data, weekStart, loading, error, onWeekChange }: { data: WeeklyCheckIns | null; weekStart: string; loading: boolean; error: string; onWeekChange: (value: string) => void }) {
  const thisWeek = currentWeekStart()
  const nextWeek = addDays(weekStart, 7)
  const weekEnd = addDays(weekStart, 6)
  return <article className={`${styles.chartCard} ${checkInStyles.checkInCard}`}>
    <header className={checkInStyles.checkInHeader}>
      <div><span>HOURLY ATTENDANCE</span><h3>Gym check-ins</h3><p>See every check-in hour during the gym's scheduled opening times.</p></div>
      <div className={checkInStyles.weekControls}>
        <button type="button" aria-label="Previous week" onClick={() => onWeekChange(addDays(weekStart,-7))}><ChevronLeft/></button>
        <div><CalendarDays/><span>Selected week</span><strong>{formatDate(weekStart)} – {formatDate(weekEnd)}</strong></div>
        <button type="button" aria-label="Next week" disabled={nextWeek > thisWeek} onClick={() => onWeekChange(nextWeek)}><ChevronRight/></button>
        {weekStart !== thisWeek && <button type="button" className={checkInStyles.thisWeek} onClick={() => onWeekChange(thisWeek)}>This week</button>}
      </div>
    </header>
    {error && <p className={checkInStyles.inlineError} role="alert">{error}</p>}
    {loading ? <div className={checkInStyles.chartLoading}><LoaderCircle className={styles.spin}/>Loading hourly attendance...</div> : data && <WeeklyHourlyChart data={data}/>} 
  </article>
}

function WeeklyHourlyChart({ data }: { data: WeeklyCheckIns }) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(data.weekStart,index))
  const initialDate = today() >= data.weekStart && today() <= data.weekEnd ? today() : data.weekStart
  const [selectedDate, setSelectedDate] = useState(initialDate)
  useEffect(() => setSelectedDate(initialDate), [initialDate])

  const totalFor = (date: string) => data.hours.filter(point => point.date === date).reduce((sum,point) => sum+point.checkIns,0)
  const dayTotals = dates.map(date => ({ date, total: totalFor(date) }))
  const slots = data.hours.filter(point => point.date === selectedDate)

  return <>
    <div className={checkInStyles.dayTabs} role="tablist" aria-label="Days in selected week">
      {dayTotals.map(day => <button type="button" role="tab" aria-selected={day.date===selectedDate} className={day.date===selectedDate ? checkInStyles.activeDay : ''} key={day.date} onClick={() => setSelectedDate(day.date)}><span>{shortWeekday(day.date)}</span><strong>{Number(day.date.slice(8))}</strong><small>{day.total} visits</small></button>)}
    </div>
    <HourlyBars slots={slots} date={selectedDate}/>
  </>
}

function HourlyBars({ slots, date }: { slots: HourlyCheckInPoint[]; date: string }) {
  if (!slots.length) return <div className={styles.noData}>The gym has no opening hours configured for this day.</div>
  const peak = Math.max(0,...slots.map(point => point.checkIns))
  const { maximum, ticks } = memberChartScale(peak)
  const width = Math.max(760, slots.length*64+72), height = 320, left = 52, right = 16, top = 32, bottom = 54
  const plotWidth = width-left-right, plotHeight = height-top-bottom, band = plotWidth/slots.length
  const barWidth = Math.min(38,band*.58)
  const y = (value:number) => top+plotHeight-value/maximum*plotHeight
  return <div className={`${styles.chartScroller} ${checkInStyles.hourlyScroller}`}><svg className={`${styles.chart} ${checkInStyles.hourlyChart}`} style={{ minWidth: width }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Hourly check-ins for ${formatDate(date)}`}>
    <defs><linearGradient id="hourlyCheckInBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7b57e7"/><stop offset="100%" stopColor="#18cfe5"/></linearGradient></defs>
    <g className={styles.gridLines}>{ticks.map(tick => <g key={tick}><line x1={left} x2={width-right} y1={y(tick)} y2={y(tick)}/><text x={left-10} y={y(tick)+4}>{tick}</text></g>)}</g>
    {slots.map((slot,index) => {
      const x=left+index*band+(band-barWidth)/2
      return <g key={slot.hourStart}><rect className={checkInStyles.hourBar} x={x} y={y(slot.checkIns)} width={barWidth} height={Math.max(3,top+plotHeight-y(slot.checkIns))} rx="8"><title>{formatHour(slot.hourStart)}–{formatHour(slot.hourEnd)}: {slot.checkIns} check-ins</title></rect><text className={checkInStyles.hourValue} x={x+barWidth/2} y={Math.max(top+13,y(slot.checkIns)-8)}>{slot.checkIns}</text><text className={checkInStyles.hourLabel} x={x+barWidth/2} y={height-18}>{formatHour(slot.hourStart)}</text></g>
    })}
  </svg></div>
}

function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{ month:'short',day:'numeric' }) }
function shortWeekday(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{ weekday:'short' }) }
function formatHour(value: string) { return value.slice(11,16) }

function MembershipChart({ data }: { data: FacilityAnalytics }) {
  const [hoveredIndex,setHoveredIndex]=useState<number|null>(null)
  if (!data.series.length) return <div className={styles.noData}>No membership data for this period.</div>
  const width=1000, height=390, left=68, right=24, top=28, bottom=58
  const plotWidth=width-left-right, plotHeight=height-top-bottom, plotBottom=top+plotHeight
  const peak=Math.max(0,...data.series.flatMap(point => [point.activeMembers,point.newMembers]))
  const { maximum,ticks }=lineChartScale(peak)
  const x=(index:number)=>left+(data.series.length<2?plotWidth/2:index*plotWidth/(data.series.length-1))
  const y=(value:number)=>top+plotHeight-value/maximum*plotHeight
  const labels=pointLabels(data), every=Math.max(1,Math.ceil(labels.length/7))
  const points=(key:'activeMembers'|'newMembers')=>data.series.map((point,index)=>({x:x(index),y:y(point[key])}))
  const line=(key:'activeMembers'|'newMembers')=>smoothLine(points(key))
  const activePoints=points('activeMembers')
  const activeArea=`${smoothLine(activePoints)} L ${activePoints.at(-1)!.x},${plotBottom} L ${activePoints[0].x},${plotBottom} Z`
  const chartSeries=[
    { key:'activeMembers',label:'active members',lineClass:growthStyles.activeLine,dotClass:growthStyles.activeDot },
    { key:'newMembers',label:'new members',lineClass:growthStyles.newLine,dotClass:growthStyles.newDot },
  ] as const

  const hovered=hoveredIndex===null?null:data.series[hoveredIndex]
  const tooltipWidth=154
  const tooltipX=hoveredIndex===null?left:Math.min(width-right-tooltipWidth,Math.max(left,x(hoveredIndex)-tooltipWidth/2))

  return <div className={`${styles.chartScroller} ${growthStyles.chartScroller}`}><svg className={`${styles.chart} ${growthStyles.chart}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Active and new members over time" onMouseLeave={()=>setHoveredIndex(null)}>
    <defs><linearGradient id="activeMemberArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#15bcd1" stopOpacity=".14"/><stop offset="100%" stopColor="#15bcd1" stopOpacity="0"/></linearGradient></defs>
    <g className={growthStyles.grid}>{ticks.map(tick=><g key={tick}><line x1={left} x2={width-right} y1={y(tick)} y2={y(tick)}/><text x={left-13} y={y(tick)+4}>{tick}</text></g>)}</g>
    <g className={growthStyles.axes}><line x1={left} x2={left} y1={top} y2={plotBottom}/><line x1={left} x2={width-right} y1={plotBottom} y2={plotBottom}/><text className={growthStyles.yTitle} transform={`translate(18 ${top+plotHeight/2}) rotate(-90)`}>Members</text></g>
    <path className={growthStyles.activeArea} d={activeArea}/>
    {chartSeries.map(series=><g key={series.key}><path className={series.lineClass} d={line(series.key)}/>{data.series.map((point,index)=><circle key={point.periodStart} className={`${series.dotClass} ${hoveredIndex===index?growthStyles.highlightedDot:''}`} cx={x(index)} cy={y(point[series.key])} r="3"><title>{labels[index]}: {point[series.key]} {series.label}</title></circle>)}</g>)}
    <g className={growthStyles.xLabels}>{labels.map((label,index)=>(index%every===0||index===labels.length-1)&&<g key={`${label}-${index}`}><line x1={x(index)} x2={x(index)} y1={plotBottom} y2={plotBottom+6}/><text x={x(index)} y={height-20}>{label}</text></g>)}</g>
    {hovered&&hoveredIndex!==null&&<g className={growthStyles.tooltip} pointerEvents="none"><line className={growthStyles.hoverGuide} x1={x(hoveredIndex)} x2={x(hoveredIndex)} y1={top} y2={plotBottom}/><rect x={tooltipX} y={top+8} width={tooltipWidth} height="78" rx="10"/><text className={growthStyles.tooltipDate} x={tooltipX+12} y={top+27}>{labels[hoveredIndex]}</text><circle className={growthStyles.tooltipActive} cx={tooltipX+16} cy={top+48} r="4"/><text x={tooltipX+27} y={top+52}>Active</text><text className={growthStyles.tooltipNumber} x={tooltipX+141} y={top+52}>{hovered.activeMembers}</text><circle className={growthStyles.tooltipNew} cx={tooltipX+16} cy={top+69} r="4"/><text x={tooltipX+27} y={top+73}>New</text><text className={growthStyles.tooltipNumber} x={tooltipX+141} y={top+73}>{hovered.newMembers}</text></g>}
    <g className={growthStyles.hitAreas}>{data.series.map((point,index)=>{const start=index===0?left:(x(index-1)+x(index))/2;const end=index===data.series.length-1?width-right:(x(index)+x(index+1))/2;return <rect key={point.periodStart} x={start} y={top} width={Math.max(1,end-start)} height={plotHeight} tabIndex={0} aria-label={`${labels[index]}: ${point.activeMembers} active, ${point.newMembers} new`} onMouseEnter={()=>setHoveredIndex(index)} onFocus={()=>setHoveredIndex(index)} onBlur={()=>setHoveredIndex(null)}/>})}</g>
  </svg></div>
}

function smoothLine(points:{x:number;y:number}[]) {
  if (!points.length) return ''
  if (points.length===1) return `M ${points[0].x},${points[0].y}`
  return points.slice(1).reduce((path,point,index)=>{const previous=points[index];const middle=(previous.x+point.x)/2;return `${path} C ${middle},${previous.y} ${middle},${point.y} ${point.x},${point.y}`},`M ${points[0].x},${points[0].y}`)
}

function lineChartScale(peak:number) {
  if (peak<=1) return { maximum:1,ticks:[0,1] }
  const roughStep=peak/5
  const magnitude=10**Math.floor(Math.log10(roughStep))
  const normalized=roughStep/magnitude
  const niceNormalized=normalized<=1?1:normalized<=2?2:normalized<=5?5:10
  const step=Math.max(1,niceNormalized*magnitude)
  const maximum=Math.ceil(peak/step)*step
  return { maximum,ticks:Array.from({length:Math.round(maximum/step)+1},(_,index)=>index*step) }
}

function MachineChart({ data }: { data: FacilityAnalytics }) {
  const total = data.activeMachines + data.machinesUnderRepair + data.machinesOutOfService
  const active = total ? data.activeMachines / total * 100 : 0
  const repair = total ? data.machinesUnderRepair / total * 100 : 0
  const style = { background: total ? `conic-gradient(#b7f43d 0 ${active}%, #ffc247 ${active}% ${active+repair}%, #ff5573 ${active+repair}% 100%)` : '#e8ece6' }
  return <div className={styles.machineVisual}><div className={styles.donut} style={style}><span><Dumbbell/><strong>{total}</strong><small>Total units</small></span></div><div className={styles.machineLegend}><p><i data-color="lime"/><span>Active and ready</span><strong>{data.activeMachines}</strong></p><p><i data-color="orange"/><span>Needs attention</span><strong>{data.machinesUnderRepair}</strong></p><p><i data-color="pink"/><span>Out of service</span><strong>{data.machinesOutOfService}</strong></p></div></div>
}
