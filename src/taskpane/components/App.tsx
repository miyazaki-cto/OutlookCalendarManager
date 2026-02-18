import * as React from "react";
import { graphService } from "../../services/graphService";
import { groupConfig, Member } from "../../config/groupConfig";
import { CalendarEvent, SelectedMembers, SelectedGroups } from "../../types/calendar";
import { CalendarView } from "./CalendarView";
import { MemberTimelineView } from "./MemberTimelineView";
import { MemberDayTimelineView } from "./MemberDayTimelineView";
import { getUserColor, clearUserColors } from '../../utils/userColors';
import { EventFormModal } from "./EventFormModal";
import { SettingsModal } from "./SettingsModal";
import { ListView } from "./ListView";
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
  
  const [viewMode, setViewMode] = React.useState<'calendar' | 'list' | 'timeline' | 'day-timeline'>('timeline');

  const [eventFormMode, setEventFormMode] = React.useState<'create' | 'edit' | null>(null);
  const [eventFormInitialStart, setEventFormInitialStart] = React.useState<Date | undefined>();
  const [eventFormInitialEnd, setEventFormInitialEnd] = React.useState<Date | undefined>();
  const [eventToEdit, setEventToEdit] = React.useState<CalendarEvent | null>(null);
  const [eventFormInitialAttendees, setEventFormInitialAttendees] = React.useState<string[]>([]);

  const [selectedGroups, setSelectedGroups] = React.useState<SelectedGroups>(() => {
    const saved = localStorage.getItem('calendar_selectedGroups');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedMembers, setSelectedMembers] = React.useState<SelectedMembers>(() => {
    const saved = localStorage.getItem('calendar_selectedMembers');
    return saved ? JSON.parse(saved) : {};
  });

  // フィルターの一時的な選択状態
  const [tempSelectedGroups, setTempSelectedGroups] = React.useState<SelectedGroups>(selectedGroups);
  const [tempSelectedMembers, setTempSelectedMembers] = React.useState<SelectedMembers>(selectedMembers);

  // 選択内容に変更があるかチェック
  const hasChanges = React.useMemo(() => {
    const memberEmails = Object.keys({ ...selectedMembers, ...tempSelectedMembers });
    const memberChanged = memberEmails.some(email => !!selectedMembers[email] !== !!tempSelectedMembers[email]);
    if (memberChanged) return true;

    const groupIds = Object.keys({ ...selectedGroups, ...tempSelectedGroups });
    return groupIds.some(id => !!selectedGroups[id] !== !!tempSelectedGroups[id]);
  }, [selectedMembers, tempSelectedMembers, selectedGroups, tempSelectedGroups]);

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
  const [isGroupExpanded, setIsGroupExpanded] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('calendar_isGroupExpanded');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMemberExpanded, setIsMemberExpanded] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('calendar_isMemberExpanded');
    if (saved !== null) return saved === 'true';
    return window.innerWidth > 600;
  });

  React.useEffect(() => {
    localStorage.setItem('calendar_selectedGroups', JSON.stringify(selectedGroups));
  }, [selectedGroups]);

  React.useEffect(() => {
    localStorage.setItem('calendar_selectedMembers', JSON.stringify(selectedMembers));
  }, [selectedMembers]);

  React.useEffect(() => {
    localStorage.setItem('calendar_isGroupExpanded', String(isGroupExpanded));
  }, [isGroupExpanded]);

  React.useEffect(() => {
    localStorage.setItem('calendar_isMemberExpanded', String(isMemberExpanded));
  }, [isMemberExpanded]);

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
      
      // 保存された選択がない場合のみ、ログインユーザーをデフォルト選択にする
      if (Object.keys(selectedMembers).length === 0) {
        const initialMembers = { [email]: true };
        setSelectedMembers(initialMembers);
        await loadEvents([email]);
      } else {
        await loadEvents(Object.keys(selectedMembers));
      }
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
    const newTempSelectedGroups = { ...tempSelectedGroups };
    const group = groupConfig.find(g => g.id === groupId);
    if (!group) return;

    if (newTempSelectedGroups[groupId]) {
      delete newTempSelectedGroups[groupId];
      const newTempSelectedMembers = { ...tempSelectedMembers };
      group.members.forEach(member => {
        // 自分自身（currentUserEmail）は解除しない
        if (member.email !== currentUserEmail) {
          delete newTempSelectedMembers[member.email];
        }
      });
      setTempSelectedMembers(newTempSelectedMembers);
    } else {
      newTempSelectedGroups[groupId] = true;
      const newTempSelectedMembers = { ...tempSelectedMembers };
      group.members.forEach(member => newTempSelectedMembers[member.email] = true);
      setTempSelectedMembers(newTempSelectedMembers);
    }
    setTempSelectedGroups(newTempSelectedGroups);
  };

  const handleMemberToggle = (email: string) => {
    const newTempSelectedMembers = { ...tempSelectedMembers };
    if (newTempSelectedMembers[email]) {
      delete newTempSelectedMembers[email];
    } else {
      newTempSelectedMembers[email] = true;
    }
    setTempSelectedMembers(newTempSelectedMembers);
  };

  const handleApplyFilter = () => {
    setSelectedGroups(tempSelectedGroups);
    setSelectedMembers(tempSelectedMembers);
    loadEvents(Object.keys(tempSelectedMembers).length > 0 ? Object.keys(tempSelectedMembers) : [currentUserEmail]);
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

  const handleSaveSettings = (past: number, future: number, noLimit: boolean) => {
    setPastMonths(past);
    setFutureMonths(future);
    setIsNoLimit(noLimit);
    localStorage.setItem('calendar_pastMonths', String(past));
    localStorage.setItem('calendar_futureMonths', String(future));
    localStorage.setItem('calendar_isNoLimit', String(noLimit));
    setIsSettingsOpen(false);
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
        <h1 className="header-title">{title}</h1>
        
        <div className="header-view-switcher">
          <div className="view-mode-buttons">
            <button onClick={() => setViewMode('calendar')} className={viewMode === 'calendar' ? 'btn-active' : 'btn-inactive'} title="カレンダー">📅 <span className="btn-text">カレンダー</span></button>
            <button onClick={() => setViewMode('timeline')} className={viewMode === 'timeline' ? 'btn-active' : 'btn-inactive'} title="週ライン">📊 <span className="btn-text">週ライン</span></button>
            <button onClick={() => setViewMode('day-timeline')} className={viewMode === 'day-timeline' ? 'btn-active' : 'btn-inactive'} title="日ライン">🕒 <span className="btn-text">日ライン</span></button>
            <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'btn-active' : 'btn-inactive'} title="当日リスト">📋 <span className="btn-text">リスト</span></button>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={() => loadEvents(Object.keys(selectedMembers))} disabled={loading} className="btn-refresh" title="更新">🔄</button>
          <button onClick={() => setIsSettingsOpen(true)} className="btn-settings" title="設定">⚙️</button>
        </div>
      </div>
      
      {/* フィルターセクション */}
      <div className="filter-container">
        <div className={`filter-block ${isMemberExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="filter-block-header" onClick={() => setIsMemberExpanded(!isMemberExpanded)}>
            <div className="filter-header-content">
              <span className="expand-icon">{isMemberExpanded ? '▼' : '▶'}</span>
              <span className="filter-title">
                メンバー・会議室選択 ({Object.values(tempSelectedMembers).filter(v => v).length})
              </span>
            </div>
          </div>
          {isMemberExpanded && (
            <div className="filter-block-body">
              <div className="filter-merged-container">
                {groupConfig.filter(g => g.id !== 'all').map(group => (
                  <div key={group.id} className="filter-group-row">
                    <div className="filter-group-name-cell">
                      <label className="checkbox-label group-label">
                        <input
                          type="checkbox"
                          checked={!!tempSelectedGroups[group.id]}
                          onChange={() => handleGroupToggle(group.id)}
                        />
                        {group.name}
                      </label>
                    </div>
                    <div className="filter-group-divider">|</div>
                    <div className="filter-members-cell">
                      {group.members.map(member => (
                        <label key={member.email} className="checkbox-label member-label">
                          <input
                            type="checkbox"
                            checked={!!tempSelectedMembers[member.email]}
                            onChange={() => handleMemberToggle(member.email)}
                          />
                          {member.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="filter-actions-row">
                <button
                  onClick={() => {
                    const allMembers = getAvailableMembers();
                    const newTempSelectedMembers = {};
                    allMembers.forEach(m => newTempSelectedMembers[m.email] = true);
                    setTempSelectedMembers(newTempSelectedMembers);
                    
                    const newTempSelectedGroups = {};
                    groupConfig.forEach(g => newTempSelectedGroups[g.id] = true);
                    setTempSelectedGroups(newTempSelectedGroups);
                  }}
                  className="btn-small"
                >
                  全選択
                </button>
                <button
                  onClick={() => {
                    setTempSelectedGroups({});
                    setTempSelectedMembers({ [currentUserEmail]: true });
                  }}
                  className="btn-small"
                >
                  クリア
                </button>
                <button
                  onClick={handleApplyFilter}
                  disabled={!hasChanges}
                  className={`btn-save ${hasChanges ? 'blink-animation' : 'btn-disabled'}`}
                  style={{ padding: '6px 20px', fontSize: '14px' }}
                >
                  適用
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="main-content-container">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div className="loading-text">{loadingMessage}</div>
          </div>
        )}
        {viewMode === 'calendar' ? (
          <CalendarView events={events} onSelectEvent={handleSelectEvent} onSelectSlot={handleSelectSlot} currentUserEmail={currentUserEmail} />
        ) : viewMode === 'timeline' ? (
          <MemberTimelineView events={events} members={getAvailableMembers().filter(m => selectedMembers[m.email])} onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent} currentUserEmail={currentUserEmail} />
        ) : viewMode === 'day-timeline' ? (
          <MemberDayTimelineView events={events} members={getAvailableMembers().filter(m => selectedMembers[m.email])} onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent} currentUserEmail={currentUserEmail} />
        ) : (
          <ListView 
            events={events} 
            members={getAvailableMembers()} 
            onSelectEvent={handleSelectEvent} 
            getEventColor={getEventColor}
          />
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
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;