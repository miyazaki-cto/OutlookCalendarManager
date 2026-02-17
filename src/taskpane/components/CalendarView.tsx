import * as React from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent } from '../../types/calendar';
import { groupConfig } from '../../config/groupConfig';
import { getUserColor } from '../../utils/userColors';

const locales = {
  'ja': ja,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  events: CalendarEvent[];
  currentUserEmail: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentUserEmail,
  onSelectEvent,
  onSelectSlot,
}) => {
  const [view, setView] = React.useState<View>('week');
  const [date, setDate] = React.useState(new Date());
  const calendarRef = React.useRef<HTMLDivElement>(null);

// カレンダーマウント時と表示切替時に午前8時までスクロール
React.useEffect(() => {
    const scrollToMorning = () => {
      if (calendarRef.current && (view === 'day' || view === 'week')) {
        // タイムグリッドを探す
        const timeGrid = calendarRef.current.querySelector('.rbc-time-content');
        if (timeGrid) {
          // 午前7時までスクロール（午前8時が見やすい位置に）
          const scrollPosition = 320; // 調整可能な固定値
          timeGrid.scrollTop = scrollPosition;
        }
      }
    };
  
    // 少し遅延させてDOMが完全にレンダリングされるのを待つ
    const timer = setTimeout(scrollToMorning, 150);
    return () => clearTimeout(timer);
  }, [view, date]);

  // イベントデータをreact-big-calendar形式に変換
  const calendarEvents = events.map(event => {
    // 所有者名を取得
    const ownerMember = groupConfig.flatMap(g => g.members)
      .find(m => m.email === event.ownerEmail);
    const ownerName = ownerMember?.name || event.ownerEmail.split('@')[0];
    const isOwner = event.ownerEmail === currentUserEmail;
    
    return {
      id: event.id || `event-${Math.random()}`,
      title: isOwner ? event.subject : `${ownerName}: ${event.subject}`, // 他人の予定には名前を追加
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
      resource: {
        ...event,
        isOwner: event.ownerEmail === currentUserEmail,
        ownerName: ownerName,
      },
    };
  });

  // イベントのスタイルを設定（色分け）
  const eventStyleGetter = (event: any) => {
    const isOwner = event.resource.isOwner;
    const ownerEmail = event.resource.ownerEmail;
    
    // 会議室判定
    const member = groupConfig.flatMap(g => g.members)
      .find(m => m.email === ownerEmail);
    const isResource = member?.type === 'resource';
    
    // ユーザーごとの色を取得
    const color = getUserColor(ownerEmail, isOwner, isResource);
    
    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: 'white',
        cursor: 'pointer',
      }
    };
  };

  // カスタムツールバー
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = toolbar.date;
      
      // ビューに応じて表示を変更
      if (toolbar.view === 'month') {
        return (
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {format(date, 'yyyy年 M月', { locale: ja })}
          </span>
        );
      } else if (toolbar.view === 'week') {
        // 週表示：週の最初と最後の日付を表示
        const weekStart = startOfWeek(date, { locale: ja, weekStartsOn: 1 });
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        return (
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {format(weekStart, 'yyyy年 M月d日', { locale: ja })} - {format(weekEnd, 'M月d日', { locale: ja })}
          </span>
        );
      } else {
        // 日表示：年月日と曜日を表示
        return (
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {format(date, 'yyyy年 M月d日 (E)', { locale: ja })}
          </span>
        );
      }
    };

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '10px',
        borderBottom: '2px solid #ddd'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={goToBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f2f1',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← 前
          </button>
          <button 
            onClick={goToToday}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0078d4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            今日
          </button>
          <button 
            onClick={goToNext}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f2f1',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            次 →
          </button>
        </div>

        {label()}

        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => toolbar.onView('day')}
            style={{
              padding: '8px 16px',
              backgroundColor: toolbar.view === 'day' ? '#0078d4' : '#f3f2f1',
              color: toolbar.view === 'day' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            日
          </button>
          <button
            onClick={() => toolbar.onView('week')}
            style={{
              padding: '8px 16px',
              backgroundColor: toolbar.view === 'week' ? '#0078d4' : '#f3f2f1',
              color: toolbar.view === 'week' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            週
          </button>
          <button
            onClick={() => toolbar.onView('month')}
            style={{
              padding: '8px 16px',
              backgroundColor: toolbar.view === 'month' ? '#0078d4' : '#f3f2f1',
              color: toolbar.view === 'month' ? 'white' : 'black',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            月
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '600px' }} ref={calendarRef}>
    <Calendar
    localizer={localizer}
    events={calendarEvents}
    startAccessor="start"
    endAccessor="end"
    view={view}
    onView={setView}
    date={date}
    onNavigate={setDate}
    style={{ height: '100%' }}
    eventPropGetter={eventStyleGetter}
    onSelectEvent={(event) => {
        console.log('Calendar event clicked:', event); // デバッグ用
        onSelectEvent(event.resource);
    }}
    onSelectSlot={onSelectSlot}
    selectable
    components={{
        toolbar: CustomToolbar,
    }}
    messages={{
        today: '今日',
        previous: '前',
        next: '次',
        month: '月',
        week: '週',
        day: '日',
        agenda: '予定リスト',
        date: '日付',
        time: '時間',
        event: '予定',
        noEventsInRange: 'この期間に予定はありません',
    }}
    />
    </div>
  );
};