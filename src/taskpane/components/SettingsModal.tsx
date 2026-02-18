import * as React from "react";
import "./SettingsModal.css";

interface SettingsModalProps {
  pastMonths: number;
  futureMonths: number;
  isNoLimit: boolean;
  onPastMonthsChange: (val: number) => void;
  onFutureMonthsChange: (val: number) => void;
  onisNoLimitChange: (val: boolean) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  pastMonths,
  futureMonths,
  isNoLimit,
  onPastMonthsChange,
  onFutureMonthsChange,
  onisNoLimitChange,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">表示設定</h2>
          <button type="button" onClick={onClose} className="close-button">
            ×
          </button>
        </div>
        <div className="form-body">
          <div className="form-field">
            <label className="label-text">予定の取得範囲</label>
            <p className="description-text">範囲が狭いほど、予定の読み込みが高速になります。</p>
            
            <div className="settings-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isNoLimit}
                  onChange={(e) => onisNoLimitChange(e.target.checked)}
                  className="checkbox-input"
                />
                期間指定なし（前後1年分を取得）
              </label>
            </div>

            <div className={`settings-controls ${isNoLimit ? "disabled" : ""}`}>
              <div className="settings-row">
                <span className="control-label">過去</span>
                <select
                  value={pastMonths}
                  disabled={isNoLimit}
                  onChange={(e) => onPastMonthsChange(parseInt(e.target.value, 10))}
                  className="input-field select-small"
                  aria-label="過去の取得月数"
                >
                  {[0, 1, 2, 3, 6, 12].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="control-unit">ヶ月分</span>
              </div>

              <div className="settings-row">
                <span className="control-label">未来</span>
                <select
                  value={futureMonths}
                  disabled={isNoLimit}
                  onChange={(e) => onFutureMonthsChange(parseInt(e.target.value, 10))}
                  className="input-field select-small"
                  aria-label="未来の取得月数"
                >
                  {[0, 1, 2, 3, 6, 12, 24].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="control-unit">ヶ月分</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-save">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
