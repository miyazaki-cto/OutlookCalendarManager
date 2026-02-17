export interface Member {
    email: string;
    name: string;
    type: 'user' | 'resource';
  }
  
  export interface Group {
    id: string;
    name: string;
    members: Member[];
  }
  
  // グループ設定
  // TODO: 実際のメールアドレスと名前に置き換えてください
  export const groupConfig: Group[] = [
    {
      id: 'ptf',
      name: 'PTF',
      members: [
        { email: 'maruyama@greenprop.jp', name: '丸山', type: 'user' },
        { email: 'fukuzaki@greenprop.jp', name: '清水', type: 'user' },
        { email: 'sakata@greenprop.jp', name: '坂田', type: 'user' },
        { email: 'matsunobu@greenprop.jp', name: '松延', type: 'user' },
        { email: 'itou@greenprop.jp', name: '伊藤', type: 'user' },
        { email: 'naito1@greenprop.jp', name: '内藤', type: 'user' },
        { email: 'yamaguchi@greenprop.jp', name: '山口', type: 'user' },
        { email: 'mori@greenprop.jp', name: '森', type: 'user' },
        { email: 'oshiro@greenprop.jp', name: '大城', type: 'user' },
        { email: 'nakayama@greenprop.jp', name: '中山', type: 'user' },
        { email: 'shiiki@greenprop.jp', name: '椎木', type: 'user' },
        { email: 'watanabe@greenprop.jp', name: '渡邊', type: 'user' },
        // 必要に応じて追加
      ]
    },
    {
      id: 'hubste',
      name: 'ハブステ',
      members: [
        { email: 'sakakibara@greenprop.jp', name: '榊原', type: 'user' },
        { email: 'nagashima@greenprop.jp', name: '長嶋', type: 'user' },
        { email: 'nagasawa@greenprop.jp', name: '長澤', type: 'user' },
        { email: 'nagatsuka@greenprop.jp', name: '永塚', type: 'user' },
        { email: 'shimomura@greenprop.jp', name: '下村', type: 'user' },
        { email: 'miyazaki@greenprop.jp', name: '宮崎', type: 'user' },
        // 必要に応じて追加
      ]
    },
    {
      id: 'executive',
      name: '役員',
      members: [
        { email: 'kawazoe@greenprop.jp', name: 'かつこさん', type: 'user' },
        { email: 'k.kawazoe01@greenprop.jp', name: 'ケンさん', type: 'user' },
        { email: 'morimatsu@greenprop.jp', name: '森松さん', type: 'user' },
        // 必要に応じて追加
      ]
    },
    {
    id: 'rooms',
      name: '会議室',
      members: [
        { email: 'room_1f@greenprop.jp', name: '本社-会議室1F', type: 'resource' },
        { email: 'room_3f-1@greenprop.jp', name: '本社-会議室3F-1', type: 'resource' },
        { email: 'room_3f-2@greenprop.jp', name: '本社-会議室3F-2', type: 'resource' },
        { email: 'aqua@greenprop.jp', name: '本社-アクア', type: 'resource' },
        { email: 'twingo@greenprop.jp', name: '本社-トゥインゴ', type: 'resource' },
        { email: 'zoom_1@greenprop.jp', name: 'zoom_1', type: 'resource' },
        { email: 'zoom_2@greenprop.jp', name: 'zoom_2', type: 'resource' },
        { email: 'room_2f-mtg@greenprop.jp', name: '物流-2FMTGルーム', type: 'resource' },
        // 必要に応じて追加（最大10個未満）
      ]
    },
    {
      id: 'all',
      name: '全員',
      members: [
        // PTF + ハブステ + 役員 の全メンバーをここに列挙
        { email: 'kawazoe@greenprop.jp', name: 'かつこさん', type: 'user' },
        { email: 'k.kawazoe01@greenprop.jp', name: 'ケンさん', type: 'user' },
        { email: 'morimatsu@greenprop.jp', name: '森松さん', type: 'user' },
        { email: 'sakakibara@greenprop.jp', name: '榊原', type: 'user' },
        { email: 'nagashima@greenprop.jp', name: '長嶋', type: 'user' },
        { email: 'nagasawa@greenprop.jp', name: '長澤', type: 'user' },
        { email: 'nagatsuka@greenprop.jp', name: '永塚', type: 'user' },
        { email: 'shimomura@greenprop.jp', name: '下村', type: 'user' },
        { email: 'maruyama@greenprop.jp', name: '丸山', type: 'user' },
        { email: 'fukuzaki@greenprop.jp', name: '清水', type: 'user' },
        { email: 'sakata@greenprop.jp', name: '坂田', type: 'user' },
        { email: 'matsunobu@greenprop.jp', name: '松延', type: 'user' },
        { email: 'itou@greenprop.jp', name: '伊藤', type: 'user' },
        { email: 'naito1@greenprop.jp', name: '内藤', type: 'user' },
        { email: 'yamaguchi@greenprop.jp', name: '山口', type: 'user' },
        { email: 'mori@greenprop.jp', name: '森', type: 'user' },
        { email: 'oshiro@greenprop.jp', name: '大城', type: 'user' },
        { email: 'nakayama@greenprop.jp', name: '中山', type: 'user' },
        { email: 'shiiki@greenprop.jp', name: '椎木', type: 'user' },
        { email: 'watanabe@greenprop.jp', name: '渡邊', type: 'user' },
        { email: 'miyazaki@greenprop.jp', name: '宮崎', type: 'user' },
      ]
    }
  ];
  
