import * as React from "react";
import { graphService } from "../../services/graphService";
import { groupConfig, Member } from "../../config/groupConfig";
import { CalendarEvent, SelectedMembers, SelectedGroups } from "../../types/calendar";
import { CalendarView } from "./CalendarView";
import { MemberTimelineView } from "./MemberTimelineView";
import { getUserColor, clearUserColors } from '../../utils/userColors';
import { EventFormModal } from "./EventFormModal";
import { SettingsModal } from "./SettingsModal";
import "./App.css";

export interface AppProps {
  title: string;
}

const App: React.FC<AppProps> = ({ title }) => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = React.useState<string>("");
  
  const [viewMode, setViewMode] = React.useState<'calendar' | 'list' | 'timeline'>('timeline');

  const [eventFormMode, setEventFormMode] = React.useState<'create' | 'edit' | null>(null);
  const [eventFormInitialStart, setEventFormInitialStart] = React.useState<Date | undefined>();
  const [eventFormInitialEnd, setEventFormInitialEnd] = React.useState<Date | undefined>();
  const [eventToEdit, setEventToEdit] = React.useState<CalendarEvent | null>(null);
  const [eventFormInitialAttendees, setEventFormInitialAttendees] = React.useState<string[]>([]);

  const [selectedGroups, setSelectedGroups] = React.useState<SelectedGroups>({});
  const [selectedMembers, setSelectedMembers] = React.useState<SelectedMembers>({});

  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  // 取得範囲の設定
  const [pastMonths, setPastMonths] = React.useState<number>(() => {
    const saved = localStorage.getItem('calendar_pastMonths');
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const [futureMonths, setFutureMonths] = React.useState<number>(() => {
    const saved = localStorage.getItem('calendar_futureMonths');
    return saved !== null ? parseInt(saved, 10) : 2;
  });
  const [isNoLimit, setIsNoLimit] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('calendar_isNoLimit');
    return saved === 'true';
  });

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isGroupExpanded, setIsGroupExpanded] = React.useState<boolean>(true);
  const [isMemberExpanded, setIsMemberExpanded] = React.useState<boolean>(() => {
    return window.innerWidth > 600;
  });

  React.useEffect(() => {
    graphService.initialize();
    const checkAuth = async () => {
      if (isLoggedIn) {
        const isValid = await graphService.checkAuthStatus();
        if (!isValid) {
          setIsLoggedIn(false);
          setCurrentUserEmail('');
          setSelectedMembers({});
          setSelectedGroups({});
          setEvents([]);
          alert('セッションが期限切れです。再度ログインしてください。');
        }
      }
      checkAuth();
    };
    const interval = setInterval(checkAuth, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (isLoggedIn && Object.keys(selectedMembers).length > 0) {
      loadEvents(Object.keys(selectedMembers));
    }
  }, [pastMonths, futureMonths, isNoLimit]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setLoadingMessage('ログイン中...');
      await graphService.login();
      const email = await graphService.getCurrentUserEmail();
      setCurrentUserEmail(email);
      setIsLoggedIn(true);
      setSelectedMembers({ [email]: true });
      await loadEvents([email]);
    } catch (error) {
      console.error('Failed to login:', error);
      alert('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (userEmails: string[]) => {
    try {
      setLoading(true);
      setLoadingMessage('予定を取得中...');
      clearUserColors();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let startDate: string;
      let endDate: string;

      if (isNoLimit) {
        const start = new Date(today.getFullYear() - 1, today.getMonth(), 1);
        const end = new Date(today.getFullYear() + 1, today.getMonth() + 1, 0);
        startDate = start.toISOString();
        endDate = end.toISOString();
      } else {
        const start = new Date(today.getFullYear(), today.getMonth() - pastMonths, 1);
        const end = new Date(today.getFullYear(), today.getMonth() + futureMonths + 1, 0);
        startDate = start.toISOString();
        endDate = end.toISOString();
      }
      
      if (userEmails.length === 1 && userEmails[0] === currentUserEmail) {
        const myEvents = await graphService.getMyEvents(startDate, endDate);
        setEvents(myEvents.map(e => ({ ...e, ownerEmail: currentUserEmail })));
      } else {
        const allEvents = await graphService.getMultipleUsersEvents(userEmails, startDate, endDate);
        setEvents(allEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      alert('予定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelectedGroups = { ...selectedGroups };
    const group = groupConfig.find(g => g.id === groupId);
    if (!group) return;

    if (newSelectedGroups[groupId]) {
      delete newSelectedGroups[groupId];
      const newSelectedMembers = { ...selectedMembers };
      group.members.forEach(member => delete newSelectedMembers[member.email]);
      setSelectedMembers(newSelectedMembers);
      loadEvents(Object.keys(newSelectedMembers).length > 0 ? Object.keys(newSelectedMembers) : [currentUserEmail]);
    } else {
      newSelectedGroups[groupId] = true;
      const newSelectedMembers = { ...selectedMembers };
      group.members.forEach(member => newSelectedMembers[member.email] = true);
      setSelectedMembers(newSelectedMembers);
      loadEvents(Object.keys(newSelectedMembers));
    }
    setSelectedGroups(newSelectedGroups);
  };

  const handleMemberToggle = (email: string) => {
    const newSelectedMembers = { ...selectedMembers };
    if (newSelectedMembers[email]) {
      delete newSelectedMembers[email];
    } else {
      newSelectedMembers[email] = true;
    }
    setSelectedMembers(newSelectedMembers);
    loadEvents(Object.keys(newSelectedMembers).length > 0 ? Object.keys(newSelectedMembers) : [currentUserEmail]);
  };

  const getAvailableMembers = (): Member[] => {
    const seenEmails = new Set<string>();
    return groupConfig.flatMap(g => g.members).filter(m => {
      if (seenEmails.has(m.email)) return false;
      seenEmails.add(m.email);
      return true;
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    const member = groupConfig.flatMap(g => g.members).find(m => m.email === event.ownerEmail);
    return getUserColor(event.ownerEmail, event.ownerEmail === currentUserEmail, member?.type === 'resource');
  };

  const handleSelectEvent = (event: CalendarEvent) => setSelectedEvent(event);

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; memberEmail?: string }) => {
    setEventFormMode('create');
    setEventFormInitialStart(slotInfo.start);
    setEventFormInitialEnd(slotInfo.end);
    setEventFormInitialAttendees([currentUserEmail, ...(slotInfo.memberEmail && slotInfo.memberEmail !== currentUserEmail ? [slotInfo.memberEmail] : [])]);
  };
  
  const handleSaveEvent = async (eventData: any) => {
    try {
      setLoading(true);
      if (eventFormMode === 'create') {
        await graphService.createEvent(eventData);
      } else if (eventToEdit) {
        await graphService.updateEvent(eventToEdit.id, eventData);
      }
      await loadEvents(Object.keys(selectedMembers));
      closeEventForm();
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 3000);
      return;
    }
    try {
      setLoading(true);
      await graphService.deleteEvent(selectedEvent.id);
      await loadEvents(Object.keys(selectedMembers));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const openEditModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setEventFormMode('edit');
    setSelectedEvent(null);
  };
  
  const closeEventForm = () => {
    setEventFormMode(null);
    setEventToEdit(null);
  };

  const closeEventDetail = () => setSelectedEvent(null);

  if (!isLoggedIn) {
    return (
      <div className="app-container">
        <h1>{title}</h1>
        <button onClick={handleLogin} disabled={loading} className="btn-save">
          {loading ? 'ログイン中...' : 'Microsoft 365でログイン'}
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header-container">
        <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{title}</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setIsSettingsOpen(true)} className="btn-settings" title="設定">⚙️</button>
          <button onClick={() => loadEvents(Object.keys(selectedMembers))} disabled={loading} className="btn-refresh">🔄</button>
        </div>
      </div>
      
      {/* フィルターセクション */}
      <div className="filter-container">
        {/* グループフィルター */}
        <div className={`filter-block ${isGroupExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="filter-block-header" onClick={() => setIsGroupExpanded(!isGroupExpanded)}>
            <span className="filter-title">グループ選択</span>
            <span className="expand-icon">{isGroupExpanded ? '▼' : '▶'}</span>
          </div>
          {isGroupExpanded && (
            <div className="filter-block-body">
              <div className="checkbox-wrap-container">
                {groupConfig.map(group => (
                  <label key={group.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!selectedGroups[group.id]}
                      onChange={() => handleGroupToggle(group.id)}
                    />
                    {group.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* メンバーフィルター */}
        <div className={`filter-block ${isMemberExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="filter-block-header" onClick={() => setIsMemberExpanded(!isMemberExpanded)}>
            <span className="filter-title">メンバー選択</span>
            <span className="expand-icon">{isMemberExpanded ? '▼' : '▶'}</span>
          </div>
          {isMemberExpanded && (
            <div className="filter-block-body">
              <div className="checkbox-wrap-container">
                {getAvailableMembers().map(member => (
                  <label key={member.email} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!selectedMembers[member.email]}
                      onChange={() => handleMemberToggle(member.email)}
                    />
                    {member.name}
                  </label>
                ))}
              </div>
              <div className="filter-actions">
                <button
                  onClick={() => {
                    const allMembers = getAvailableMembers();
                    const newSelectedMembers = {};
                    allMembers.forEach(m => newSelectedMembers[m.email] = true);
                    setSelectedMembers(newSelectedMembers);
                    loadEvents(Object.keys(newSelectedMembers));
                  }}
                  className="btn-small"
                >
                  全選択
                </button>
                <button
                  onClick={() => {
                    setSelectedGroups({});
                    setSelectedMembers({ [currentUserEmail]: true });
                    loadEvents([currentUserEmail]);
                  }}
                  className="btn-small"
                >
                  クリア
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="view-mode-container">
        <div className="view-mode-buttons">
          <button onClick={() => setViewMode('calendar')} className={viewMode === 'calendar' ? 'btn-active' : 'btn-inactive'}>📅 カレンダー</button>
          <button onClick={() => setViewMode('timeline')} className={viewMode === 'timeline' ? 'btn-active' : 'btn-inactive'}>📊 タイムライン</button>
          <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'btn-active' : 'btn-inactive'}>📋 当日リスト</button>
        </div>
      </div>

      <div className="main-content-container">
        {loading && <div className="loading-overlay">{loadingMessage}</div>}
        {viewMode === 'calendar' ? (
          <CalendarView events={events} onSelectEvent={handleSelectEvent} onSelectSlot={handleSelectSlot} currentUserEmail={currentUserEmail} />
        ) : viewMode === 'timeline' ? (
          <MemberTimelineView events={events} members={getAvailableMembers().filter(m => selectedMembers[m.email])} onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent} currentUserEmail={currentUserEmail} />
        ) : (
          <div className="list-view">
            <h3>今日の予定 ({new Date().toLocaleDateString('ja-JP')})</h3>
            {events.filter(e => new Date(e.start.dateTime).toDateString() === new Date().toDateString()).length === 0 ? <p>予定はありません</p> : 
              events.filter(e => new Date(e.start.dateTime).toDateString() === new Date().toDateString()).map(e => (
                <div key={e.id} className="event-item" style={{ borderLeft: `5px solid ${getEventColor(e)}` }} onClick={() => handleSelectEvent(e)}>
                  <strong>{e.subject}</strong>
                  <p>{new Date(e.start.dateTime).toLocaleTimeString('ja-JP')} - {new Date(e.end.dateTime).toLocaleTimeString('ja-JP')}</p>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="modal-overlay" onClick={closeEventDetail}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEvent.subject}</h2>
              <button onClick={closeEventDetail} className="close-button">×</button>
            </div>
            <div className="form-body">
              <p>開始: {new Date(selectedEvent.start.dateTime).toLocaleString('ja-JP')}</p>
              <p>終了: {new Date(selectedEvent.end.dateTime).toLocaleString('ja-JP')}</p>
              {selectedEvent.body?.content && (
                <div className="event-body-content" dangerouslySetInnerHTML={{ __html: selectedEvent.body.content }} />
              )}
            </div>
            <div className="modal-footer">
              {selectedEvent.ownerEmail === currentUserEmail && (
                <>
                  <button onClick={() => openEditModal(selectedEvent)} className="btn-save">編集</button>
                  <button onClick={handleDeleteEvent} className="btn-delete">{confirmingDelete ? '本当に削除？' : '削除'}</button>
                </>
              )}
              <button onClick={closeEventDetail} className="btn-cancel">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {eventFormMode && (
        <EventFormModal
          mode={eventFormMode}
          event={eventToEdit || undefined}
          initialStart={eventFormInitialStart}
          initialEnd={eventFormInitialEnd}
          currentUserEmail={currentUserEmail}
          initialAttendees={eventFormInitialAttendees}
          onSave={handleSaveEvent}
          onClose={closeEventForm}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          pastMonths={pastMonths}
          futureMonths={futureMonths}
          isNoLimit={isNoLimit}
          onPastMonthsChange={v => { setPastMonths(v); localStorage.setItem('calendar_pastMonths', String(v)); }}
          onFutureMonthsChange={v => { setFutureMonths(v); localStorage.setItem('calendar_futureMonths', String(v)); }}
          onisNoLimitChange={v => { setIsNoLimit(v); localStorage.setItem('calendar_isNoLimit', String(v)); }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;