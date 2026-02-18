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
  
  // 表示モード: 'calendar' | 'timeline' | 'list'
  const [viewMode, setViewMode] = React.useState<'calendar' | 'list' | 'timeline'>('timeline');

  // 予定フォームモーダルの状態
  const [eventFormMode, setEventFormMode] = React.useState<'create' | 'edit' | null>(null);
  const [eventFormInitialStart, setEventFormInitialStart] = React.useState<Date | undefined>();
  const [eventFormInitialEnd, setEventFormInitialEnd] = React.useState<Date | undefined>();
  const [eventToEdit, setEventToEdit] = React.useState<CalendarEvent | null>(null);
  const [eventFormInitialAttendees, setEventFormInitialAttendees] = React.useState<string[]>([]);

  // グループとメンバーの選択状態
  const [selectedGroups, setSelectedGroups] = React.useState<SelectedGroups>({});
  const [selectedMembers, setSelectedMembers] = React.useState<SelectedMembers>({});

  // 選択された予定の詳細表示用
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  // 削除確認状態
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  // 取得範囲の設定
  const [pastMonths, setPastMonths] = React.useState<number>(() => {
    const saved = localStorage.getItem('calendar_pastMonths');
    return saved !== null ? parseInt(saved, 10) : 0; // デフォルト0ヶ月（当月のみ）
  });
  const [futureMonths, setFutureMonths] = React.useState<number>(() => {
    const saved = localStorage.getItem('calendar_futureMonths');
    return saved !== null ? parseInt(saved, 10) : 2; // デフォルト2ヶ月
  });
  const [isNoLimit, setIsNoLimit] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('calendar_isNoLimit');
    return saved === 'true';
  });

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    graphService.initialize();

    // 認証状態をチェック
    const checkAuth = async () => {
      if (isLoggedIn) {
        const isValid = await graphService.checkAuthStatus();
        if (!isValid) {
          // トークンが無効な場合、ログアウトして再ログインを促す
          setIsLoggedIn(false);
          setCurrentUserEmail('');
          setSelectedMembers({});
          setSelectedGroups({});
          setEvents([]);
          alert('セッションが期限切れです。再度ログインしてください。');
        }
      }

  // 初回チェック
  checkAuth();
  
  // 15分ごとに認証状態をチェック
  const interval = setInterval(checkAuth, 15 * 60 * 1000);
  
  return () => clearInterval(interval);
  }
}, [isLoggedIn]);

  // 範囲設定が変更されたら予定を再取得
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
      
      // 初期表示: 自分の予定のみ
      setSelectedMembers({ [email]: true });
      await loadEvents([email]);
    } catch (error) {
      console.error('Failed to load events:', error);

    // 認証エラーの場合は再ログインを促す
    if (error.message?.includes('login') || error.message?.includes('token') || error.statusCode === 401) {
      setIsLoggedIn(false);
      setCurrentUserEmail('');
      setSelectedMembers({});
      setSelectedGroups({});
      setEvents([]);
      alert('認証エラーが発生しました。再度ログインしてください。');
    } else {
      alert('予定の取得に失敗しました');
    }

    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (userEmails: string[]) => {
    try {
      setLoading(true);
      setLoadingMessage('予定を取得中...');
      clearUserColors(); // 色の割り当てをリセット

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let startDate: string;
      let endDate: string;

      if (isNoLimit) {
        // 「指定なし」の場合は前後1年分取得（パフォーマンスを考慮）
        const start = new Date(today.getFullYear() - 1, today.getMonth(), 1);
        const end = new Date(today.getFullYear() + 1, today.getMonth() + 1, 0);
        startDate = start.toISOString();
        endDate = end.toISOString();
      } else {
        // 設定された月数に基づいて取得範囲を計算
        const start = new Date(today.getFullYear(), today.getMonth() - pastMonths, 1);
        const end = new Date(today.getFullYear(), today.getMonth() + futureMonths + 1, 0);
        startDate = start.toISOString();
        endDate = end.toISOString();
      }
      
      console.log('Data fetch period:', {
        pastMonths,
        futureMonths,
        isNoLimit,
        startDate,
        endDate
      });
      
      if (userEmails.length === 1 && userEmails[0] === currentUserEmail) {
        const myEvents = await graphService.getMyEvents(startDate, endDate);
        console.log('Fetched events count:', myEvents.length);
        setEvents(myEvents.map(e => ({ ...e, ownerEmail: currentUserEmail })));
      } else {
        const allEvents = await graphService.getMultipleUsersEvents(userEmails, startDate, endDate);
        console.log('Fetched events count:', allEvents.length);
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
        // グループの選択を解除
        delete newSelectedGroups[groupId];
        
        const newSelectedMembers = { ...selectedMembers };
        group.members.forEach(member => {
          delete newSelectedMembers[member.email];
        });
        setSelectedMembers(newSelectedMembers);
        
        const remainingEmails = Object.keys(newSelectedMembers);
        if (remainingEmails.length > 0) {
          loadEvents(remainingEmails);
        } else {
          // 誰も選択されていない場合は自分を選択
          setSelectedMembers({ [currentUserEmail]: true });
          loadEvents([currentUserEmail]);
        }
      } else {
        // グループを選択
        newSelectedGroups[groupId] = true;
        
        const newSelectedMembers = { ...selectedMembers };
        group.members.forEach(member => {
          newSelectedMembers[member.email] = true;
        });
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
    
    const selectedEmails = Object.keys(newSelectedMembers);
    if (selectedEmails.length > 0) {
      loadEvents(selectedEmails);
    } else {
      // 誰も選択されていない場合は自分を選択
      setSelectedMembers({ [currentUserEmail]: true });
      loadEvents([currentUserEmail]);
    }
  };

  const getAvailableMembers = (): Member[] => {
    const allMembers = new Set<Member>();
    const seenEmails = new Set<string>();

    groupConfig.forEach(group => {
      group.members.forEach(member => {
        if (!seenEmails.has(member.email)) {
          seenEmails.add(member.email);
          allMembers.add(member);
        }
      });
    });

    return Array.from(allMembers);
  };

  const getEventColor = (event: CalendarEvent) => {
    const member = groupConfig.flatMap(g => g.members)
      .find(m => m.email === event.ownerEmail);
    const isOwner = event.ownerEmail === currentUserEmail;
    const isResource = member?.type === 'resource';
    
    return getUserColor(event.ownerEmail, isOwner, isResource);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    console.log('Event selected:', event); // デバッグ用
    setSelectedEvent(event);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; memberEmail?: string }) => {
    // 予定作成モーダルを開く
    setEventFormMode('create');
    setEventFormInitialStart(slotInfo.start);
    setEventFormInitialEnd(slotInfo.end);
    
    // クリックされたメンバーと本人を初期参加者に設定
    const attendees: string[] = [];
    if (currentUserEmail) {
      attendees.push(currentUserEmail);
    }
    if (slotInfo.memberEmail && slotInfo.memberEmail !== currentUserEmail) {
      attendees.push(slotInfo.memberEmail);
    }
    setEventFormInitialAttendees(attendees);
  };
  
  const handleCreateEvent = async (eventData: any) => {
    try {
      setLoading(true);
      setLoadingMessage('予定を作成中...');
      await graphService.createEvent(eventData);
      // 作成後、データを再取得
      setLoadingMessage('予定を取得中...');
      await loadEvents(Object.keys(selectedMembers));
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleEditEvent = async (eventData: any) => {
    if (!eventToEdit?.id) return;
    
    try {
      setLoading(true);
      setLoadingMessage('予定を更新中...');
      await graphService.updateEvent(eventToEdit.id, eventData);
      // 更新後、データを再取得
      setLoadingMessage('予定を取得中...');
      await loadEvents(Object.keys(selectedMembers));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    
    // 2段階確認: 1回目で確認状態に、2回目で実行
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      // 3秒後に確認状態をリセット
      setTimeout(() => setConfirmingDelete(false), 3000);
      return;
    }
    
    setConfirmingDelete(false);
    
    try {
      setLoading(true);
      setLoadingMessage('予定を削除中...');
      await graphService.deleteEvent(selectedEvent.id);
      // 削除後、データを再取得
      setLoadingMessage('予定を取得中...');
      await loadEvents(Object.keys(selectedMembers));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };
  
  const openEditModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setEventFormMode('edit');
    setSelectedEvent(null);
  };
  
  const closeEventForm = () => {
    setEventFormMode(null);
    setEventFormInitialStart(undefined);
    setEventFormInitialEnd(undefined);
    setEventToEdit(null);
    setEventFormInitialAttendees([]);
  };

  const closeEventDetail = () => {
    setSelectedEvent(null);
    setConfirmingDelete(false);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>{title}</h1>
        <button 
          onClick={handleLogin} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'default' : 'pointer',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? 'ログイン中...' : 'Microsoft 365でログイン'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px', height: '100vh', overflow: 'auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{title}</h1>
        
        {/* 表示切替ボタン - 右上に配置 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '5px 10px',
              backgroundColor: viewMode === 'calendar' ? '#0078d4' : '#f3f2f1',
              color: viewMode === 'calendar' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="カレンダー表示に切り替えます"
          >
            📅
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            style={{
              padding: '5px 10px',
              backgroundColor: viewMode === 'timeline' ? '#0078d4' : '#f3f2f1',
              color: viewMode === 'timeline' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="メンバー一覧表示に切り替えます"
          >
            📊
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '5px 10px',
              backgroundColor: viewMode === 'list' ? '#0078d4' : '#f3f2f1',
              color: viewMode === 'list' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="当日リスト表示に切り替えます"
          >
            📋
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            style={{
              padding: '5px 10px',
              backgroundColor: '#f3f2f1',
              border: '1px solid #d1d1d1',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="設定を開きます"
          >
            ⚙️
          </button>
          <button 
            onClick={() => loadEvents(Object.keys(selectedMembers))}
            disabled={loading}
            style={{
              padding: '5px 10px',
              cursor: loading ? 'default' : 'pointer',
              backgroundColor: '#0078d4',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* コンパクトなフィルターセクション */}
      <div style={{ 
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        border: '1px solid #e0e0e0'
      }}>
        {/* グループフィルター - 1行に */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '60px' }}>グループ:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
            {groupConfig.map(group => (
              <label key={group.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={!!selectedGroups[group.id]}
                  onChange={() => handleGroupToggle(group.id)}
                  style={{ marginRight: '3px' }}
                />
                {group.name}
              </label>
            ))}
          </div>
        </div>

        {/* メンバーフィルター - 1行に */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '60px' }}>メンバー:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, alignItems: 'center' }}>
            {getAvailableMembers().map(member => (
              <label key={member.email} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={!!selectedMembers[member.email]}
                  onChange={() => handleMemberToggle(member.email)}
                  style={{ marginRight: '3px' }}
                />
                {member.name}
              </label>
            ))}
            <span style={{ margin: '0 4px', color: '#999' }}>|</span>
            <button
              onClick={() => {
                const allMembers = getAvailableMembers();
                const newSelectedMembers = { ...selectedMembers };
                allMembers.forEach(member => {
                  newSelectedMembers[member.email] = true;
                });
                setSelectedMembers(newSelectedMembers);
                loadEvents(Object.keys(newSelectedMembers));
              }}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                backgroundColor: '#0078d4',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              全選択
            </button>
            <button
              onClick={() => {
                setSelectedGroups({});
                setSelectedMembers({ [currentUserEmail]: true });
                loadEvents([currentUserEmail]);
              }}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                backgroundColor: '#605e5c',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              クリア
            </div>
        </div>
      </div>

      {/* 表示切替とリフレッシュ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '6px 12px',
              backgroundColor: viewMode === 'calendar' ? '#0078d4' : '#f3f2f1',
              color: viewMode === 'calendar' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            カレンダー
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            style={{
              padding: '6px 12px',
              backgroundColor: viewMode === 'timeline' ? '#0078d4' : '#f3f2f1',
              color: viewMode === 'timeline' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            メンバー予定表
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 12px',
              backgroundColor: viewMode === 'list' ? '#0078d4' : '#f3f2f1',
              color: viewMode === 'list' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            当日リスト
          </button>
        </div>
        <button
          onClick={() => loadEvents(Object.keys(selectedMembers))}
          disabled={loading}
          style={{
            padding: '6px 12px',
            cursor: loading ? 'default' : 'pointer',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px'
          }}
        >
          {loading ? '読込中...' : '更新'}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {loadingMessage}
          </div>
        )}

        {viewMode === 'calendar' ? (
          <CalendarView
            events={events}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            currentUserEmail={currentUserEmail}
          />
        ) : viewMode === 'timeline' ? (
          <MemberTimelineView
            events={events}
            members={groupConfig
            .flatMap(g => g.members)
            .filter(member => selectedMembers[member.email])
            .filter((member, index, self) => 
              index === self.findIndex(m => m.email === member.email)
                  今日の予定 ({today.getMonth() + 1}月{today.getDate()}日)
                </h3>
                {
                todayEvents.map((event, index) => {
                const ownerMember = groupConfig.flatMap(g => g.members)
                  .find(m => m.email === event.ownerEmail);
                const ownerName = ownerMember?.name || event.ownerEmail;
                const isCurrentUser = event.ownerEmail === currentUserEmail;
                  
                  return (
                    <div 
                      key={index}
                      style={{
                        border: `2px solid ${getEventColor(event)}`,
                        padding: '12px',
                        marginBottom: '12px',
                        borderRadius: '6px',
                        backgroundColor: '#f9f9f9',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSelectEvent(event)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '15px' }}>{event.subject}</strong>
                        <span style={{ 
                          fontSize: '12px', 
                          color: getEventColor(event),
                          fontWeight: 'bold',
                          marginLeft: '10px'
                        }}>
                          {isCurrentUser ? '自分' : ownerName}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                        📅 {new Date(event.start.dateTime).toLocaleString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {' - '}
                        {new Date(event.end.dateTime).toLocaleString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {event.location?.displayName && (
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '3px' }}>
                          📍 {event.location.displayName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 予定詳細モーダル */}
      {selectedEvent && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
              }} onClick={closeEventDetail}>
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '80vh',
                  overflow: 'auto'
                }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontSize: '18px', margin: 0 }}>{selectedEvent.subject}</h2>
                    <button onClick={closeEventDetail} style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer'
                    }}>×</button>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <p><strong>開始:</strong> {new Date(selectedEvent.start.dateTime).toLocaleString('ja-JP')}</p>
                    <p><strong>終了:</strong> {new Date(selectedEvent.end.dateTime).toLocaleString('ja-JP')}</p>
                    
                    {selectedEvent.location?.displayName && (
                      <p><strong>場所:</strong> {selectedEvent.location.displayName}</p>
                    )}
                    
                    {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                      <div>
                        <p><strong>参加者:</strong></p>
                        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                          {selectedEvent.attendees.map((attendee, idx) => (
                            <li key={idx}>{attendee.emailAddress.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {selectedEvent.body?.content && (
                      <div>
                        <p><strong>詳細:</strong></p>
                        <div style={{ 
                          marginTop: '5px', 
                          padding: '10px', 
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}>
                          {selectedEvent.body.content.replace(/<[^>]*>/g, '')}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {selectedEvent && selectedEvent.ownerEmail === currentUserEmail && (
                      <>
                        <button 
                          onClick={() => openEditModal(selectedEvent)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#0078d4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          編集
                        </button>
                        <button 
                          onClick={handleDeleteEvent}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: confirmingDelete ? '#a4262c' : '#d13438',
                            color: 'white',
                            border: confirmingDelete ? '2px solid #fff' : 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: confirmingDelete ? 'bold' : 'normal'
                          }}
                        >
                          {confirmingDelete ? '本当に削除？' : '削除'}
                        </button>
                      </>
                    )}
                    <button onClick={closeEventDetail} style={{
                      padding: '8px 16px',
                      backgroundColor: '#f3f2f1',
                      border: '1px solid #d1d1d1',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}>閉じる</button>
                  </div>
                </div>
              </div>
            )}

            {/* 予定作成・編集モーダル */}
            {eventFormMode && (
              <EventFormModal
                mode={eventFormMode}
                event={eventToEdit || undefined}
                initialStart={eventFormInitialStart}
                initialEnd={eventFormInitialEnd}
                currentUserEmail={currentUserEmail}
                initialAttendees={eventFormInitialAttendees}
                onSave={eventFormMode === 'create' ? handleCreateEvent : handleEditEvent}
                onClose={closeEventForm}
              />
            )}

      {/* 設定モーダル */}
      {isSettingsOpen && (
        <SettingsModal
          pastMonths={pastMonths}
          futureMonths={futureMonths}
          isNoLimit={isNoLimit}
          onPastMonthsChange={(val) => {
            setPastMonths(val);
            localStorage.setItem('calendar_pastMonths', String(val));
          }}
          onFutureMonthsChange={(val) => {
            setFutureMonths(val);
            localStorage.setItem('calendar_futureMonths', String(val));
          }}
          onisNoLimitChange={(val) => {
            setIsNoLimit(val);
            localStorage.setItem('calendar_isNoLimit', String(val));
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;