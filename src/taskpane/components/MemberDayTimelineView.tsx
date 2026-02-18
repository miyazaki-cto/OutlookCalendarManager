import * as React from 'react';
import { CalendarEvent } from '../../types/calendar';
import { Member } from '../../config/groupConfig';
import { getUserColor } from '../../utils/userColors';

interface MemberDayTimelineViewProps {
  events: CalendarEvent[];
  members: Member[];
  currentUserEmail: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date; memberEmail?: string }) => void;
}

export const MemberDayTimelineView: React.FC<MemberDayTimelineViewProps> = ({
  events,
  members,
  currentUserEmail,
  onSelectEvent,
  onSelectSlot,
}) => {
  const dayDatePickerRef = React.useRef<HTMLInputElement>(null);
  const [currentDate, setCurrentDate] = React.useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // 8:00から22:00までの時間帯を生成
  const hours = React.useMemo(() => {
    const h = [];
    for (let i = 8; i <= 22; i++) {
      h.push(i);
    }
    return h;
  }, []);

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  };

  const getEventsForMemberOnDay = (memberEmail: string, date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return events.filter(event => {
      if (event.ownerEmail !== memberEmail) return false;
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      return eventStart < dayEnd && eventEnd > dayStart;
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    const member = members.find(m => m.email === event.ownerEmail);
    const isOwner = event.ownerEmail === currentUserEmail;
    const isResource = member?.type === 'resource';
    return getUserColor(event.ownerEmail, isOwner, isResource);
  };

  return (
    <div className="day-timeline-container">
      <div className="timeline-nav" style={{ justifyContent: 'flex-start', gap: '8px' }}>
        <div className="current-date-display" style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '8px' }}>
          {currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </div>
        <button onClick={goToPreviousDay} className="btn-inactive">← 前日</button>
        <button onClick={goToToday} className="btn-active">今日</button>
        <button onClick={goToNextDay} className="btn-inactive">翌日 →</button>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            className="btn-inactive" 
            onClick={() => {
              const input = dayDatePickerRef.current;
              if (input) {
                if (typeof input.showPicker === 'function') {
                  input.showPicker();
                } else {
                  input.click();
                }
              }
            }}
            title="日付を選択"
          >
            📅
          </button>
          <input 
            ref={dayDatePickerRef}
            type="date" 
            tabIndex={-1}
            aria-hidden="true"
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              opacity: 0, 
              pointerEvents: 'none',
              border: 'none', 
              padding: 0,
              margin: 0
            }}
            onChange={(e) => {
              if (e.target.value) {
                const selectedDate = new Date(e.target.value);
                selectedDate.setHours(0, 0, 0, 0);
                setCurrentDate(selectedDate);
              }
            }}
          />
        </div>
      </div>

      <div className="timeline-table-wrapper">
        <table className="timeline-table">
          <thead>
            <tr>
              <th className="sticky-col header-cell">メンバー</th>
              {hours.map(hour => (
                <th key={hour} className="hour-cell">
                  {hour}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={hours.length + 1} style={{ padding: '20px', textAlign: 'center' }}>
                  メンバーが選択されていません
                </td>
              </tr>
            ) : (
              members.map((member, mIndex) => {
                const dayEvents = getEventsForMemberOnDay(member.email, currentDate);
                return (
                  <tr key={mIndex}>
                    <td className="sticky-col member-cell">
                      <div className="member-info">
                        <div className="member-avatar" style={{ 
                          backgroundColor: member.email === currentUserEmail ? '#0078d4' : 
                                          member.type === 'resource' ? '#107c10' : '#605e5c' 
                        }}>
                          {member.name.charAt(0)}
                        </div>
                        <span className="member-name">{member.name}</span>
                      </div>
                    </td>
                    {hours.map(hour => {
                      // その時間帯に含まれる予定を抽出
                      const hourStart = new Date(currentDate);
                      hourStart.setHours(hour, 0, 0, 0);
                      const hourEnd = new Date(currentDate);
                      hourEnd.setHours(hour + 1, 0, 0, 0);

                      const eventsInHour = dayEvents.filter(e => {
                        const eStart = new Date(e.start.dateTime);
                        const eEnd = new Date(e.end.dateTime);
                        return eStart < hourEnd && eEnd > hourStart;
                      });

                      return (
                        <td 
                          key={hour} 
                          className="time-slot-cell"
                          onClick={() => onSelectSlot({ start: hourStart, end: hourEnd, memberEmail: member.email })}
                        >
                          <div className="slot-content">
                            {eventsInHour.map((event, eIndex) => {
                              const eStart = new Date(event.start.dateTime);
                              const eEnd = new Date(event.end.dateTime);
                              // セル内の表示調整（簡易版: 1つ目の予定をメインに表示）
                              if (eIndex > 0 && eventsInHour.length > 2) return null; // 3つ以上は省略
                              
                              return (
                                <div
                                  key={eIndex}
                                  className="timeline-event-bar"
                                  style={{ backgroundColor: getEventColor(event) }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectEvent(event);
                                  }}
                                  title={`${eStart.getHours()}:${eStart.getMinutes().toString().padStart(2, '0')} - ${eEnd.getHours()}:${eEnd.getMinutes().toString().padStart(2, '0')} ${event.subject}`}
                                >
                                  {eStart.getHours() === hour && <span className="event-subject-mini">{event.subject}</span>}
                                </div>
                              );
                            })}
                            {eventsInHour.length > 2 && <div className="more-events-indicator">...</div>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
