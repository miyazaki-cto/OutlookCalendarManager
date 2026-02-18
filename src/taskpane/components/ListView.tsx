import * as React from 'react';
import { CalendarEvent } from '../../types/calendar';
import { Member } from '../../config/groupConfig';

interface ListViewProps {
  events: CalendarEvent[];
  members: Member[];
  onSelectEvent: (event: CalendarEvent) => void;
  getEventColor: (event: CalendarEvent) => string;
}

export const ListView: React.FC<ListViewProps> = ({
  events,
  members,
  onSelectEvent,
  getEventColor,
}) => {
  const datePickerRef = React.useRef<HTMLInputElement>(null);
  const [currentDate, setCurrentDate] = React.useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

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

  const filteredEvents = React.useMemo(() => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    return events.filter(event => {
      const eventStart = new Date(event.start.dateTime);
      return eventStart >= dayStart && eventStart <= dayEnd;
    }).sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
  }, [events, currentDate]);

  const getOwnerName = (email: string) => {
    const member = members.find(m => m.email === email);
    return member ? member.name : email.split('@')[0];
  };

  return (
    <div className="list-view-container">
      <div className="timeline-nav" style={{ justifyContent: 'flex-start', gap: '8px' }}>
        <div className="current-date-display" style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '8px' }}>
          {currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </div>
        <div className="nav-buttons">
          <button onClick={goToPreviousDay} className="btn-inactive">← 前日</button>
          <button onClick={goToToday} className="btn-active">今日</button>
          <button onClick={goToNextDay} className="btn-inactive">翌日 →</button>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            className="btn-inactive" 
            onClick={() => datePickerRef.current?.showPicker ? datePickerRef.current.showPicker() : datePickerRef.current?.click()}
            title="日付を選択"
          >
            📅
          </button>
          <input 
            ref={datePickerRef}
            type="date" 
            tabIndex={-1}
            aria-hidden="true"
            style={{ 
              position: 'absolute', 
              top: 0, left: 0, width: '100%', height: '100%', 
              opacity: 0, pointerEvents: 'none' 
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

      <div className="list-view" style={{ padding: '10px' }}>
        <h3>予定一覧 ({currentDate.toLocaleDateString('ja-JP')})</h3>
        {filteredEvents.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>予定はありません</p>
        ) : (
          filteredEvents.map(e => (
            <div 
              key={e.id} 
              className="event-item" 
              style={{ borderLeft: `5px solid ${getEventColor(e)}` }} 
              onClick={() => onSelectEvent(e)}
            >
              <div style={{ fontWeight: 'bold' }}>
                <span style={{ color: '#666', marginRight: '4px' }}>[{getOwnerName(e.ownerEmail || '')}]</span>
                {e.subject}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#444' }}>
                {new Date(e.start.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - 
                {new Date(e.end.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
