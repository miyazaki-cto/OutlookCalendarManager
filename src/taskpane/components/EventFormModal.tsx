import * as React from "react";
import { CalendarEvent } from "../../types/calendar";
import { groupConfig } from "../../config/groupConfig";
import "./EventFormModal.css";

// ローカル時刻を datetime-local 用の文字列に変換するヘルパー
const toLocalDateTimeString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// 30分間隔の時間選択肢を生成するヘルパー
const getTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = String(hour).padStart(2, "0");
      const m = String(minute).padStart(2, "0");
      options.push(`${h}:${m}`);
    }
  }
  return options;
};

const timeOptions = getTimeOptions();

interface EventFormModalProps {
  mode: "create" | "edit";
  event?: CalendarEvent;
  initialStart?: Date;
  initialEnd?: Date;
  currentUserEmail: string;
  initialAttendees?: string[];
  onSave: (eventData: any) => Promise<void>;
  onClose: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  mode,
  event,
  initialStart,
  initialEnd,
  currentUserEmail,
  initialAttendees,
  onSave,
  onClose,
}) => {
  const [subject, setSubject] = React.useState(event?.subject || "");
  const [startDate, setStartDate] = React.useState(() => {
    const date = event ? new Date(event.start.dateTime) : initialStart || new Date();
    return toLocalDateTimeString(date);
  });
  const [endDate, setEndDate] = React.useState(() => {
    const date = event
      ? new Date(event.end.dateTime)
      : initialEnd ||
        (() => {
          const d = initialStart || new Date();
          d.setHours(d.getHours() + 1);
          return d;
        })();
    return toLocalDateTimeString(date);
  });

  const [selectedAttendees, setSelectedAttendees] = React.useState<{ [email: string]: boolean }>(
    () => {
      if (event?.attendees) {
        const map: { [email: string]: boolean } = {};
        event.attendees.forEach((a) => {
          map[a.emailAddress.address] = true;
        });
        return map;
      }
      // 新規作成時: initialAttendeesがあればそれを使用、なければ本人をデフォルト
      if (mode === 'create') {
        const map: { [email: string]: boolean } = {};
        if (initialAttendees && initialAttendees.length > 0) {
          initialAttendees.forEach(email => { map[email] = true; });
        } else if (currentUserEmail) {
          map[currentUserEmail] = true;
        }
        return map;
      }
      return {};
    }
  );

  const [selectedRooms, setSelectedRooms] = React.useState<{ [email: string]: boolean }>(() => {
    if (event?.attendees) {
      const map: { [email: string]: boolean } = {};
      const roomGroup = groupConfig.find((g) => g.id === "rooms");
      if (roomGroup) {
        event.attendees.forEach((a) => {
          if (roomGroup.members.some((m) => m.email === a.emailAddress.address)) {
            map[a.emailAddress.address] = true;
          }
        });
      }
      return map;
    }
    return {};
  });

  const [location, setLocation] = React.useState(event?.location?.displayName || "");
  const [body, setBody] = React.useState(() => {
    if (!event?.body?.content) return '';
    // HTMLタグと実体参照（&nbsp;等）を除去し、前後の空白・改行をトリム
    return event.body.content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;|&amp;nbsp;/g, ' ')
      .trim();
  });
  const [saving, setSaving] = React.useState(false);

  // 全メンバー（会議室を除く）
  const allMembers = groupConfig
    .filter((g) => g.id !== "rooms")
    .flatMap((g) => g.members)
    .filter((member, index, self) => index === self.findIndex((m) => m.email === member.email));

  // 会議室一覧
  const rooms = groupConfig.find((g) => g.id === "rooms")?.members || [];

  const handleAttendeeToggle = (email: string) => {
    setSelectedAttendees((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  // グループ全員を追加
  const handleGroupAdd = (groupId: string) => {
    const group = groupConfig.find(g => g.id === groupId);
    if (!group) return;
    setSelectedAttendees(prev => {
      const next = { ...prev };
      group.members.forEach(m => {
        if (m.type === 'user') next[m.email] = true;
      });
      return next;
    });
  };

  // グループ全員を解除
  const handleGroupRemove = (groupId: string) => {
    const group = groupConfig.find(g => g.id === groupId);
    if (!group) return;
    setSelectedAttendees(prev => {
      const next = { ...prev };
      group.members.forEach(m => {
        delete next[m.email];
      });
      return next;
    });
  };

  // 全解除
  const handleClearAll = () => {
    setSelectedAttendees({});
  };

  const handleRoomToggle = (email: string) => {
    setSelectedRooms((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    setSaving(true);

    try {
      // 参加者リストを作成
      const attendees = [];

      // メンバー（必須参加者）
      Object.keys(selectedAttendees).forEach((email) => {
        if (selectedAttendees[email]) {
          const member = allMembers.find((m) => m.email === email);
          if (member) {
            attendees.push({
              emailAddress: {
                address: email,
                name: member.name,
              },
              type: "required",
            });
          }
        }
      });

      // 会議室（リソース）
      Object.keys(selectedRooms).forEach((email) => {
        if (selectedRooms[email]) {
          const room = rooms.find((r) => r.email === email);
          if (room) {
            attendees.push({
              emailAddress: {
                address: email,
                name: room.name,
              },
              type: "resource",
            });
          }
        }
      });

      const eventData = {
        subject: subject.trim(),
        start: {
          dateTime: new Date(startDate).toISOString(),
          timeZone: "Tokyo Standard Time",
        },
        end: {
          dateTime: new Date(endDate).toISOString(),
          timeZone: "Tokyo Standard Time",
        },
        location: location.trim()
          ? {
              displayName: location.trim(),
            }
          : undefined,
        attendees: attendees.length > 0 ? attendees : undefined,
        body: body.trim()
          ? {
              contentType: "text",
              content: body.trim(),
            }
          : undefined,
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("予定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (type: "start" | "end", dateValue: string) => {
    if (type === "start") {
      const [, time] = startDate.split("T");
      const newStart = `${dateValue}T${time || "00:00"}`;
      setStartDate(newStart);
      
      // 開始日が変更されたら、終了時刻を1時間後に自動調整
      const newStartDate = new Date(newStart);
      if (!isNaN(newStartDate.getTime())) {
        const newEndDate = new Date(newStartDate);
        newEndDate.setHours(newStartDate.getHours() + 1);
        setEndDate(toLocalDateTimeString(newEndDate));
      }
    } else {
      const [, time] = endDate.split("T");
      setEndDate(`${dateValue}T${time || "00:00"}`);
    }
  };

  const handleTimeChange = (type: "start" | "end", timeValue: string) => {
    if (type === "start") {
      const [date] = startDate.split("T");
      const newStart = `${date}T${timeValue}`;
      setStartDate(newStart);
      
      // 開始時刻が変更されたら、終了時刻を1時間後に自動調整
      const newStartDate = new Date(newStart);
      if (!isNaN(newStartDate.getTime())) {
        const newEndDate = new Date(newStartDate);
        newEndDate.setHours(newStartDate.getHours() + 1);
        setEndDate(toLocalDateTimeString(newEndDate));
      }
    } else {
      const [date] = endDate.split("T");
      setEndDate(`${date}T${timeValue}`);
    }
  };

  const [startDatePart, startTimePart] = startDate.split("T");
  const [endDatePart, endTimePart] = endDate.split("T");

  const selectedAttendeeCount = Object.values(selectedAttendees).filter(v => !!v).length;
  const isAttendeeRequiredMissing = selectedAttendeeCount === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* ヘッダー */}
          <div className="modal-header">
            <h2 className="modal-title">
              {mode === "create" ? "予定を作成" : "予定を編集"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="close-button"
            >
              ×
            </button>
          </div>

          {/* フォーム本体 */}
          <div className="form-body">
            {/* タイトル */}
            <div className="form-field">
              <label className="label-text">
                📝 タイトル <span className="required-star">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="タイトルを入力"
                required
                className="input-field"
              />
            </div>

            {/* 開始日時 */}
            <div className="form-field">
              <label className="label-text">
                📅 開始日時 <span className="required-star">*</span>
              </label>
              <div className="datetime-input-container">
                <input
                  type="text"
                  value={startDatePart}
                  onChange={(e) => handleDateChange("start", e.target.value)}
                  placeholder="YYYY-MM-DD"
                  required
                  className="input-field date-input"
                />
                <select
                  value={startTimePart}
                  onChange={(e) => handleTimeChange("start", e.target.value)}
                  className="input-field time-select"
                  aria-label="開始時刻"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 終了日時 */}
            <div className="form-field">
              <label className="label-text">
                📅 終了日時 <span className="required-star">*</span>
              </label>
              <div className="datetime-input-container">
                <input
                  type="text"
                  value={endDatePart}
                  onChange={(e) => handleDateChange("end", e.target.value)}
                  placeholder="YYYY-MM-DD"
                  required
                  className="input-field date-input"
                />
                <select
                  value={endTimePart}
                  onChange={(e) => handleTimeChange("end", e.target.value)}
                  className="input-field time-select"
                  aria-label="終了時刻"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 参加者 */}
            <div className="form-field">
              <label className="label-text">
                👥 参加者 <span className="required-star">*</span>
              </label>
              {/* グループ一括追加・削除ボタン */}
              <div className="group-buttons-container">
                {groupConfig.filter(g => g.id !== 'rooms' && g.id !== 'all').map(group => (
                  <span key={group.id} className="group-button-wrapper">
                    <button
                      type="button"
                      onClick={() => handleGroupAdd(group.id)}
                      className="btn-add-group"
                    >
                      +{group.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGroupRemove(group.id)}
                      className="btn-remove-group"
                    >
                      -{group.name}
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="btn-clear-all"
                >
                  全解除
                </button>
              </div>
              <div className="selection-list-container">
                {allMembers.length === 0 ? (
                  <p className="empty-message">参加者がいません</p>
                ) : (
                  <div className="checkbox-grid">
                    {allMembers.map((member) => (
                      <label key={member.email} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!selectedAttendees[member.email]}
                          onChange={() => handleAttendeeToggle(member.email)}
                          className="checkbox-input"
                        />
                        {member.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 会議室 */}
            <div className="form-field">
              <label className="label-text">
                🏢 会議室
              </label>
              <div className="selection-list-container rooms">
                {rooms.length === 0 ? (
                  <p className="empty-message">会議室がありません</p>
                ) : (
                  <div className="checkbox-grid">
                    {rooms.map((room) => (
                      <label key={room.email} className="checkbox-label room">
                        <input
                          type="checkbox"
                          checked={!!selectedRooms[room.email]}
                          onChange={() => handleRoomToggle(room.email)}
                          className="checkbox-input"
                        />
                        {room.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 場所（会議室以外） */}
            <div className="form-field">
              <label className="label-text">
                📍 場所（会議室以外）
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: オンライン、本社1F会議室"
                className="input-field"
              />
            </div>

            {/* 詳細 */}
            <div className="form-field">
              <label className="label-text">
                📝 詳細
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="議題、資料、メモなど"
                rows={4}
                className="textarea-field"
              />
            </div>
          </div>

          {/* フッター */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-cancel"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || isAttendeeRequiredMissing}
              className={`btn-save ${isAttendeeRequiredMissing ? 'btn-disabled' : ''}`}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
