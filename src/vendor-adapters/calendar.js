// Centralized calendar helpers so we can swap in vendor utilities later
// without touching the rest of the app. For now, we reuse the existing logic.

function pad2(n){ return String(n).padStart(2,'0'); }
function toICSDate(d){
  const y=d.getUTCFullYear(), m=pad2(d.getUTCMonth()+1), da=pad2(d.getUTCDate());
  const h=pad2(d.getUTCHours()), mi=pad2(d.getUTCMinutes()), s=pad2(d.getUTCSeconds());
  return `${y}${m}${da}T${h}${mi}${s}Z`;
}

export function mkICS(opp, type, start, durationMin){
  const end = new Date(start.getTime() + durationMin*60000);
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JobFlow//EN','BEGIN:VEVENT',
    'DTSTAMP:'+toICSDate(new Date()),
    'DTSTART:'+toICSDate(start),
    'DTEND:'+toICSDate(end),
    'SUMMARY:'+`JobFlow ${type} — ${opp.company} — ${opp.role}`,
    'DESCRIPTION:'+`Planned via JobFlow triage. Link: ${opp.job_url||''}`,
    'END:VEVENT','END:VCALENDAR'
  ];
  return new Blob([lines.join('\r\n')], { type:'text/calendar' });
}

export function mkGCalUrl(opp, type, start, durationMin){
  const end = new Date(start.getTime()+durationMin*60000);
  const fmt = (d)=> encodeURIComponent(d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'));
  const dates = fmt(start)+'/'+fmt(end);
  const text = encodeURIComponent(`JobFlow ${type} — ${opp.company} — ${opp.role}`);
  const details = encodeURIComponent(`Planned via JobFlow triage. ${opp.job_url||''}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
}

