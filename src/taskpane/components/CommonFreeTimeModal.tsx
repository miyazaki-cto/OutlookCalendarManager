import * as React from "react";
import { CalendarEvent } from "../../types/calendar";
import { findCommonFreeTime, TimeSlot } from "../../utils/scheduler";
import "./App.css"; // Reuse App.css for basic styles, or create specific CSS if needed

interface CommonFreeTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  selectedMemberEmails: string[];
  members: { email: string; name: string }[];
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
}

export const CommonFreeTimeModal: React.FC<CommonFreeTimeModalProps> = ({
  isOpen,
  onClose,
  events,
  selectedMemberEmails,
  members,
  onSelectSlot,
}) => {
  const [customStart, setCustomStart] = React.useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Default 2 weeks
    return d.toISOString().split('T')[0];
  });
  const [duration, setDuration] = React.useState<number>(60);
  const [workHourStart, setWorkHourStart] = React.useState(9);
  const [workHourEnd, setWorkHourEnd] = React.useState(18);
  const [excludeWeekends, setExcludeWeekends] = React.useState(true);
  const [results, setResults] = React.useState<TimeSlot[]>([]);
  const [searched, setSearched] = React.useState(false);
  const [excludeLongEvents, setExcludeLongEvents] = React.useState(false);
  const [expandedDays, setExpandedDays] = React.useState<string[]>([]);

  if (!isOpen) return null;

  const handleSearch = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    // Set end of day for the end date to include it
    end.setHours(23, 59, 59, 999);

    const foundSlots = findCommonFreeTime(
      events,
      selectedMemberEmails,
      start,
      end,
      {
        durationMinutes: duration,
        workHourStart,
        workHourEnd,
        excludeWeekends,
        excludeLongEvents
      }
    );
    setResults(foundSlots);
    setSearched(true);
    // Expand all days by default if results are few, or maybe just the first day?
    // Let's expand all for now, or none? User requested "collapsible", maybe better to start expanded?
    // Let's start with all expanded.
    const uniqueDays = Array.from(new Set(foundSlots.map(s => s.start.toDateString())));
    setExpandedDays(uniqueDays);
  };

  const handleShiftPeriod = (weeks: number) => {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    start.setDate(start.getDate() + (weeks * 7));
    end.setDate(end.getDate() + (weeks * 7));
    setCustomStart(start.toISOString().split('T')[0]);
    setCustomEnd(end.toISOString().split('T')[0]);
  };

  const toggleDay = (dayStr: string) => {
    setExpandedDays(prev => 
      prev.includes(dayStr) ? prev.filter(d => d !== dayStr) : [...prev, dayStr]
    );
  };

  const getDayName = (date: Date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };



  // Filter members to only show selected ones
  const targetMembers = members.filter(m => selectedMemberEmails.includes(m.email));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container common-free-time-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>共通の空き時間を検索</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="form-body">
            <div className="search-criteria">
                <div className="criteria-row">
                    <div className="form-field target-members-container">
                        <label className="label-text">対象メンバー ({targetMembers.length}名)</label>
                        <div className="target-members-list">
                            {targetMembers.map(m => m.name).join(', ')}
                        </div>
                    </div>
                </div>

                <div className="criteria-row">
                    <div className="form-field">
                        <label className="label-text">検索期間</label>
                        <div className="time-range-inputs">
                            <button 
                                onClick={() => handleShiftPeriod(-2)} 
                                className="btn-icon" 
                                title="2週間戻る"
                                aria-label="2週間戻る"
                            >
                                ◀
                            </button>
                            <input 
                                type="date" 
                                value={customStart} 
                                onChange={e => setCustomStart(e.target.value)} 
                                className="input-field input-date-custom"
                                aria-label="開始日"
                            />
                            <span>〜</span>
                            <input 
                                type="date" 
                                value={customEnd} 
                                onChange={e => setCustomEnd(e.target.value)} 
                                className="input-field input-date-custom"
                                aria-label="終了日"
                            />
                            <button 
                                onClick={() => handleShiftPeriod(2)} 
                                className="btn-icon" 
                                title="2週間進む"
                                aria-label="2週間進む"
                            >
                                ▶
                            </button>
                        </div>
                    </div>
                </div>

                <div className="criteria-row">
                    <div className="form-field">
                        <label className="label-text">時間帯</label>
                        <div className="time-range-inputs">
                            <input 
                                type="number" 
                                min="0" 
                                max="23" 
                                value={workHourStart} 
                                onChange={e => setWorkHourStart(Number(e.target.value))} 
                                className="input-small" 
                                aria-label="開始時間"
                            />
                            <span>〜</span>
                            <input 
                                type="number" 
                                min="0" 
                                max="23" 
                                value={workHourEnd} 
                                onChange={e => setWorkHourEnd(Number(e.target.value))} 
                                className="input-small" 
                                aria-label="終了時間"
                            />
                        </div>
                    </div>
                    <div className="form-field">
                        <label className="label-text">所要時間</label>
                        <select 
                            value={duration} 
                            onChange={e => setDuration(Number(e.target.value))} 
                            className="input-field"
                            aria-label="所要時間"
                        >
                            <option value={30}>30分</option>
                            <option value={60}>60分</option>
                            <option value={90}>90分</option>
                            <option value={120}>120分</option>
                        </select>
                    </div>
                </div>

                <div className="criteria-row footer">
                    <div className="form-field checkbox-field">
                        <label className="checkbox-label no-margin">
                            <input 
                                type="checkbox" 
                                checked={excludeWeekends} 
                                onChange={e => setExcludeWeekends(e.target.checked)} 
                                className="checkbox-input-mr"
                            />
                            土日を除く
                        </label>
                    </div>
                    <div className="form-field checkbox-field">
                        <label className="checkbox-label no-margin" title="4時間以上の予定は調整可能とみなし、空き時間として扱います">
                            <input 
                                type="checkbox" 
                                checked={excludeLongEvents} 
                                onChange={e => setExcludeLongEvents(e.target.checked)} 
                                className="checkbox-input-mr"
                            />
                            4時間以上の予定を除く
                        </label>
                    </div>
                    <div className="spacer"></div>
                    <button onClick={handleSearch} className="btn-save btn-search">検索する</button>
                </div>
            </div>

            <div className="search-results">
                <h3>検索結果 ({results.length}件)</h3>
                {!searched && <p className="placeholder-text">条件を指定して検索してください</p>}
                {searched && results.length === 0 && <p className="no-results">条件に合う空き時間は見つかりませんでした。</p>}
                
                <div className="slots-list-container">
                    {(() => {
                        // Group slots by day
                        const groupedSlots: { [key: string]: TimeSlot[] } = {};
                        results.forEach(slot => {
                            const dateKey = slot.start.toDateString();
                             if (!groupedSlots[dateKey]) groupedSlots[dateKey] = [];
                             groupedSlots[dateKey].push(slot);
                        });

                        return Object.keys(groupedSlots).map(dateKey => {
                            const dateSlots = groupedSlots[dateKey];
                            const firstSlot = dateSlots[0];
                            const isExpanded = expandedDays.includes(dateKey);
                            
                            return (
                                <div key={dateKey} className="day-group">
                                    <div 
                                        className="day-group-header" 
                                        onClick={() => toggleDay(dateKey)}
                                    >
                                        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                                        <span className="group-date">
                                            {firstSlot.start.getMonth() + 1}/{firstSlot.start.getDate()} ({getDayName(firstSlot.start)})
                                        </span>
                                        <span className="group-count">
                                            {dateSlots.length}件
                                        </span>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="day-group-body slots-list">
                                            {dateSlots.map((slot, index) => {
                                                // Display the full available range (slot.start to slot.end)
                                                // When creating, use slot.start + duration
                                                const creationEnd = new Date(slot.start.getTime() + duration * 60000);
                                                
                                                return (
                                                    <div key={index} className="slot-item">
                                                        <span className="slot-time">
                                                            {slot.start.getHours().toString().padStart(2, '0')}:{slot.start.getMinutes().toString().padStart(2, '0')}
                                                            -
                                                            {slot.end.getHours().toString().padStart(2, '0')}:{slot.end.getMinutes().toString().padStart(2, '0')}
                                                        </span>
                                                        <button 
                                                            className="btn-create-slot"
                                                            onClick={() => onSelectSlot({ start: slot.start, end: creationEnd })}
                                                        >
                                                            作成
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
