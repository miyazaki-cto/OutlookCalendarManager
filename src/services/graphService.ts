import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/authConfig';

class GraphService {
  private msalInstance: PublicClientApplication;
  private graphClient: Client | null = null;

  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  async initialize() {
    await this.msalInstance.initialize();
  }

  async login() {
    try {
      const loginResponse = await this.msalInstance.loginPopup(loginRequest);
      return loginResponse;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async getAccessToken() {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please login first.');
    }

    const request = {
      scopes: loginRequest.scopes,
      account: accounts[0]
    };

    try {
      const response = await this.msalInstance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      const response = await this.msalInstance.acquireTokenPopup(request);
      return response.accessToken;
    }
  }

  async getGraphClient() {
    if (!this.graphClient) {
      const accessToken = await this.getAccessToken();
      
      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        }
      });
    }
    return this.graphClient;
  }

  async getMyEvents(startDate: string, endDate: string) {
    const client = await this.getGraphClient();
    const events = await client
      .api('/me/calendar/events')
      .header('Prefer', 'outlook.timezone="Tokyo Standard Time"')
      .filter(`start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`)
      .select('id,subject,start,end,location,attendees,body')
      .orderby('start/dateTime')
      .top(999)
      .get();
    
    return events.value;
  }
  
  async getUserEvents(userEmail: string, startDate: string, endDate: string) {
    const client = await this.getGraphClient();
    const events = await client
      .api(`/users/${userEmail}/calendar/events`)
      .header('Prefer', 'outlook.timezone="Tokyo Standard Time"')
      .filter(`start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`)
      .select('id,subject,start,end,location,attendees,body')
      .orderby('start/dateTime')
      .top(999)
      .get();
    
    return events.value;
  }
  
  async getMultipleUsersEvents(userEmails: string[], startDate: string, endDate: string) {
    const client = await this.getGraphClient();
    const allEvents: any[] = [];
  
    for (const email of userEmails) {
      try {
        const events = await client
          .api(`/users/${email}/calendar/events`)
          .header('Prefer', 'outlook.timezone="Tokyo Standard Time"')
          .filter(`start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`)
          .select('id,subject,start,end,location,attendees,body,organizer')
          .orderby('start/dateTime')
          .top(999)
          .get();
        
        const eventsWithUser = events.value.map((event: any) => ({
          ...event,
          ownerEmail: email
        }));
        
        allEvents.push(...eventsWithUser);
      } catch (error) {
        console.error(`Failed to fetch events for ${email}:`, error);
      }
    }
  
    allEvents.sort((a, b) => 
      new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
    );
  
    return allEvents;
  }

  async getCurrentUserEmail() {
    const client = await this.getGraphClient();
    const user = await client.api('/me').select('mail,userPrincipalName').get();
    return user.mail || user.userPrincipalName;
  }

  async createEvent(event: any) {
    const client = await this.getGraphClient();
    const newEvent = await client
      .api('/me/calendar/events')
      .post(event);
    
    return newEvent;
  }

  async updateEvent(eventId: string, event: any) {
    const client = await this.getGraphClient();
    const updatedEvent = await client
      .api(`/me/calendar/events/${eventId}`)
      .patch(event);
    
    return updatedEvent;
  }

  async deleteEvent(eventId: string) {
    const client = await this.getGraphClient();
    await client
      .api(`/me/calendar/events/${eventId}`)
      .delete();
  }

  // トークンの有効性をチェック
  async checkAuthStatus(): Promise<boolean> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        return false;
      }
      
      const request = {
        scopes: loginRequest.scopes,
        account: accounts[0]
      };
      
      // サイレントトークン取得を試みる
      await this.msalInstance.acquireTokenSilent(request);
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  // ログアウト
  logout() {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalInstance.logoutPopup({
        account: accounts[0]
      });
    }
    this.graphClient = null;
  }

}

export const graphService = new GraphService();