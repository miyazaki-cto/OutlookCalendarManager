import * as React from 'react';
import { CalendarEvent } from '../../types/calendar';
import { Member } from '../../config/groupConfig';

interface ListViewProps {
  events: CalendarEvent[];
  members: Member[];
  onSelectEvent: (event: CalendarEvent) => void;
  getEventColor: (event: CalendarEvent) => string;
}

type ViewMode = 'day' | '7days' | 'week';

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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>('day');

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    const offset = viewMode === 'day' ? 1 : (viewMode === '7days' ? 7 : 7);
    newDate.setDate(newDate.getDate() - offset);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    const offset = viewMode === 'day' ? 1 : (viewMode === '7days' ? 7 : 7);
    newDate.setDate(newDate.getDate() + offset);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|&#160;|&amp;nbsp;/g, " ")
      .trim();
  };

  const getJoinUrl = (event: CalendarEvent): string | null => {
    // Teams
    if (event.onlineMeeting?.joinUrl) return event.onlineMeeting.joinUrl;
    
    // Body from Teams/Zoom/etc
    const body = event.body?.content || "";
    const teamsMatch = body.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^"'\s<>]+/);
    if (teamsMatch) return teamsMatch[0];
    
    const zoomMatch = body.match(/https:\/\/[a-z0-9]+\.zoom\.us\/j\/[^"'\s<>]+/);
    if (zoomMatch) return zoomMatch[0];

    return null;
  };

  const getAttendeeString = (event: CalendarEvent) => {
    if (!event.attendees || event.attendees.length === 0) return "";
    const names = event.attendees
      .map(a => a.emailAddress.name || a.emailAddress.address.split('@')[0])
      .filter(name => name);
    
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}名`;
  };

  const filteredEvents = React.useMemo(() => {
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    if (viewMode === 'day') {
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === '7days') {
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      // Find Sunday of the current week (assuming week starts on Monday)
      const day = start.getDay();
      const diff = day === 0 ? 0 : 7 - day;
      end.setDate(end.getDate() + diff);
      end.setHours(23, 59, 59, 999);
    }

    return events
      .filter(event => {
        const eventStart = new Date(event.start.dateTime);
        const inRange = eventStart >= start && eventStart <= end;
        if (!inRange) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const subject = (event.subject || "").toLowerCase();
        const location = (event.location?.displayName || "").toLowerCase();
        const bodySnippet = stripHtml(event.body?.content || "").toLowerCase();
        
        return subject.includes(q) || location.includes(q) || bodySnippet.includes(q);
      })
      .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
  }, [events, currentDate, searchQuery, viewMode]);

  // Group events by date
  const groupedEvents = React.useMemo(() => {
    const groups: { [key: string]: CalendarEvent[] } = {};
    filteredEvents.forEach(event => {
      const dateKey = new Date(event.start.dateTime).toLocaleDateString('ja-JP', { 
        year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' 
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  }, [filteredEvents]);

  const getOwnerName = (email: string) => {
    const member = members.find(m => m.email === email);
    return member ? member.name : email.split('@')[0];
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted': return <span className="status-badge status-accepted">承諾</span>;
      case 'tentativelyAccepted': return <span className="status-badge status-tentative">仮承諾</span>;
      case 'declined': return <span className="status-badge status-declined">辞退</span>;
      default: return null;
    }
  };

  return (
    <div className="list-view-container">
      <div className="timeline-nav" style={{ justifyContent: 'flex-start', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingRight: '12px' }}>
        <div className="current-date-display" style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '8px', flexShrink: 0 }}>
          {currentDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
        </div>
        <div className="nav-buttons" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={goToPreviousDay} className="btn-inactive" style={{ padding: '4px 8px' }}>←</button>
          <button onClick={goToToday} className="btn-active" style={{ padding: '4px 12px' }}>今日</button>
          <button onClick={goToNextDay} className="btn-inactive" style={{ padding: '4px 8px' }}>→</button>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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

      <div className="list-view-search-wrapper">
        <div className="listview-period-selector">
          <button 
            className={`btn-period ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            1日
          </button>
          <button 
            className={`btn-period ${viewMode === '7days' ? 'active' : ''}`}
            onClick={() => setViewMode('7days')}
          >
            7日間
          </button>
          <button 
            className={`btn-period ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            今週
          </button>
        </div>
        <input
          type="text"
          className="list-view-search-input"
          placeholder="予定を検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="list-view-content">
        {filteredEvents.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px 20px', color: '#666', fontSize: '14px' }}>
            {searchQuery ? "見つかりませんでした" : "予定はありません"}
          </p>
        ) : (
          Object.keys(groupedEvents).map(dateKey => (
            <React.Fragment key={dateKey}>
              <div className="list-date-header">{dateKey}</div>
              {groupedEvents[dateKey].map(e => {
                const joinUrl = getJoinUrl(e);
                const bodySnippet = stripHtml(e.body?.content || "");
                const attendeeString = getAttendeeString(e);

                return (
                  <div 
                    key={e.id} 
                    className="event-item" 
                    style={{ borderLeft: `5px solid ${getEventColor(e)}` }} 
                    onClick={() => onSelectEvent(e)}
                  >
                    <div className="event-item-header">
                      <div className="event-item-title-row">
                        <span className="event-item-owner">{getOwnerName(e.ownerEmail || '')}</span>
                        <span className="event-item-subject">{e.subject}</span>
                      </div>
                      {e.responseStatus && getStatusLabel(e.responseStatus.response)}
                    </div>

                    <div className="event-item-info">
                      <div className="event-item-info-line">
                        <span className="info-icon">🕒</span>
                        {new Date(e.start.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(e.end.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {e.location?.displayName && (
                        <div className="event-item-info-line">
                          <span className="info-icon">📍</span>
                          {e.location.displayName}
                        </div>
                      )}
                      {attendeeString && (
                        <div className="event-item-info-line">
                          <span className="info-icon">👤</span>
                          {attendeeString}
                        </div>
                      )}
                    </div>

                    {bodySnippet && (
                      <div className="event-item-body-snippet">
                        {bodySnippet}
                      </div>
                    )}

                    <div className="event-item-actions">
                      {joinUrl && (
                        <a 
                          href={joinUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn-join"
                          onClick={(e) => e.stopPropagation()}
                        >
                          会議に参加
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};
