// ユーザーごとの色を管理するユーティリティ

const colorPalette = [
    '#0078d4', // 青
    '#d83b01', // オレンジ
    '#8764b8', // 紫
    '#00b7c3', // シアン
    '#8cbd18', // ライムグリーン
    '#e3008c', // マゼンタ
    '#ff8c00', // ダークオレンジ
    '#00b294', // ティール
    '#c239b3', // ピンク
    '#ffb900', // イエロー
    '#498205', // グリーン
    '#744da9', // ダークパープル
    '#018574', // ダークティール
    '#ca5010', // レッドオレンジ
    '#4f6bed', // インディゴ
    '#ea4300', // バーントオレンジ
    '#0099bc', // ブライトシアン
    '#e81123', // レッド
    '#b146c2', // オーキッド
    '#00a300', // ブライトグリーン
  ];
  
  const userColorMap = new Map<string, string>();
  
  export const getUserColor = (email: string, isCurrentUser: boolean, isResource: boolean): string => {
    // 自分の予定は常に青
    if (isCurrentUser) {
      return '#0078d4';
    }
    
    // 会議室は常に緑
    if (isResource) {
      return '#107c10';
    }
    
    // 既に色が割り当てられている場合はそれを返す
    if (userColorMap.has(email)) {
      return userColorMap.get(email)!;
    }
    
    // 新しいユーザーに色を割り当て（index 0 は本人用の青なのでスキップ）
    const colorIndex = (userColorMap.size + 1) % colorPalette.length;
    const color = colorPalette[colorIndex];
    userColorMap.set(email, color);
    
    return color;
  };
  
  export const clearUserColors = () => {
    userColorMap.clear();
  };
  
  // デバッグ用：現在の色割り当てを取得
  export const getUserColorMap = () => {
    return new Map(userColorMap);
  };