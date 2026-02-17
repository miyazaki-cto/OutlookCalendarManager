import * as React from 'react';
import { CalendarEvent } from '../../types/calendar';
import { Member } from '../../config/groupConfig';
import { getUserColor } from '../../utils/userColors';

interface MemberTimelineViewProps {
  events: CalendarEvent[];
  members: Member[];
  currentUserEmail: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date; memberEmail?: string }) => void;
}

export const MemberTimelineView: React.FC<MemberTimelineViewProps> = ({
  events,
  members,
  currentUserEmail,
  onSelectEvent,
  onSelectSlot,
}) => {
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
    // 今週の月曜日を取得
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 日曜日の場合は-6、それ以外は1-day
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // 1週間分の日付を生成（月曜〜日曜）
  const weekDays = React.useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  // 前週へ
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  // 次週へ
  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  // 今週に戻る
  const goToThisWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // 特定の日とメンバーの予定を取得
  const getEventsForMemberAndDay = (memberEmail: string, date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return events
      .filter(event => {
        if (event.ownerEmail !== memberEmail) return false;
        
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        
        // その日に重なる予定を抽出
        return eventStart < dayEnd && eventEnd > dayStart;
      })
      .sort((a, b) => {
        // 終日予定を最初に
        const aIsAllDay = isAllDayEvent(a);
        const bIsAllDay = isAllDayEvent(b);
        
        if (aIsAllDay && !bIsAllDay) return -1;
        if (!aIsAllDay && bIsAllDay) return 1;
        
        // 時間順
        return new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime();
      });
  };

  // 終日予定かどうか判定
  const isAllDayEvent = (event: CalendarEvent) => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    
    // 終日予定は通常24時間以上
    const duration = end.getTime() - start.getTime();
    const is24HoursOrMore = duration >= 24 * 60 * 60 * 1000;
    
    return is24HoursOrMore;
  };

  // イベントの色を取得
  const getEventColor = (event: CalendarEvent) => {
    const member = members.find(m => m.email === event.ownerEmail);
    const isOwner = event.ownerEmail === currentUserEmail;
    const isResource = member?.type === 'resource';
    
    return getUserColor(event.ownerEmail, isOwner, isResource);
  };

  // 曜日の日本語表示
  const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
    {/* ナビゲーション */}
    <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: '6px 10px',
    borderBottom: '1px solid #ddd',
    marginBottom: '6px',
    backgroundColor: '#fafafa'
    }}>
    <div style={{ display: 'flex', gap: '6px' }}>
        <button 
        onClick={goToPreviousWeek}
        style={{
            padding: '4px 10px',
            backgroundColor: '#f3f2f1',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
        }}
        >
        ← 前週
        </button>
        <button 
        onClick={goToThisWeek}
        style={{
            padding: '4px 10px',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
        }}
        >
        今週
        </button>
        <button 
        onClick={goToNextWeek}
        style={{
            padding: '4px 10px',
            backgroundColor: '#f3f2f1',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
        }}
        >
        次週 →
        </button>
    </div>
    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
        {weekDays[0].getMonth() + 1}月{weekDays[0].getDate()}日 - {weekDays[6].getMonth() + 1}月{weekDays[6].getDate()}日
    </div>
    </div>

      {/* テーブル */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          minWidth: '800px' // PC表示の最小幅
        }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 2 }}>
              <th style={{ 
                minWidth: '120px',
                padding: '12px 8px',
                borderRight: '1px solid #ddd',
                borderBottom: '2px solid #ddd',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: 'bold'
              }}>
                メンバー
              </th>
              {weekDays.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isSaturday = date.getDay() === 6;
                const isSunday = date.getDay() === 0;
                
                return (
                  <th 
                    key={index}
                    style={{
                      minWidth: '140px',
                      padding: '12px 8px',
                      borderRight: '1px solid #ddd',
                      borderBottom: '2px solid #ddd',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      backgroundColor: isToday ? '#e3f2fd' : 
                                     isSaturday ? '#f0f8ff' :
                                     isSunday ? '#fff0f0' : '#f5f5f5',
                      color: isSunday ? '#d32f2f' : isSaturday ? '#1976d2' : 'inherit'
                    }}
                  >
                    <div>{dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {date.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {members.map((member, memberIndex) => (
              <tr key={memberIndex}>
                <td style={{
                  padding: '12px 8px',
                  borderRight: '1px solid #ddd',
                  borderBottom: '1px solid #ddd',
                  backgroundColor: '#fafafa',
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: member.email === currentUserEmail ? '#0078d4' : 
                                      member.type === 'resource' ? '#107c10' : '#605e5c',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {member.name.charAt(0)}
                    </div>
                    <div>{member.name}</div>
                  </div>
                </td>
                {weekDays.map((date, dayIndex) => {
                  const dayEvents = getEventsForMemberAndDay(member.email, date);
                  
                  return (
                    <td 
                      key={dayIndex}
                      onClick={() => {
                        const start = new Date(date);
                        start.setHours(9, 0, 0, 0);
                        const end = new Date(date);
                        end.setHours(10, 0, 0, 0);
                        onSelectSlot({ start, end, memberEmail: member.email });
                      }}
                      style={{
                        padding: '8px',
                        borderRight: '1px solid #ddd',
                        borderBottom: '1px solid #ddd',
                        verticalAlign: 'top',
                        minHeight: '80px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      {dayEvents.map((event, eventIndex) => {
                        const isAllDay = isAllDayEvent(event);
                        const startTime = new Date(event.start.dateTime);
                        const endTime = new Date(event.end.dateTime);
                        
                        return (
                          <div
                            key={eventIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(event);
                            }}
                            style={{
                              padding: '6px 8px',
                              marginBottom: '4px',
                              backgroundColor: getEventColor(event),
                              color: 'white',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              lineHeight: '1.4'
                            }}
                          >
                            {isAllDay ? (
                              <div>
                                <div style={{ fontWeight: 'bold' }}>終日</div>
                                <div>{event.subject}</div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 'bold' }}>
                                  {startTime.toLocaleTimeString('ja-JP', { 
                                    timeZone: 'Asia/Tokyo',
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false 
                                  })}
                                  -
                                  {endTime.toLocaleTimeString('ja-JP', { 
                                    timeZone: 'Asia/Tokyo',
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false 
                                  })}
                                </div>
                                <div>{event.subject}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};