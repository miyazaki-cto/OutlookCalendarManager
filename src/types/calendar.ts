export interface CalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  body?: {
    content: string;
  };
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  ownerEmail?: string;
}

export interface SelectedMembers {
  [email: string]: boolean;
}

export interface SelectedGroups {
  [groupId: string]: boolean;
}