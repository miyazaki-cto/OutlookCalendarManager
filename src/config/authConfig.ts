export const msalConfig = {
    auth: {
      clientId: "6d1ad28c-d707-48d5-9196-40424ddfb112",
      authority: "https://login.microsoftonline.com/1bf1c8e9-d2be-4a77-8aa2-4debf7a713d7",
      redirectUri: "https://localhost:3000/taskpane.html"
    },
    cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: false
    }
  };
  
  export const loginRequest = {
    scopes: [
      "User.Read",
      "Calendars.ReadWrite",
      "Calendars.Read.Shared",
      "Place.Read.All"
    ]
  };
  
  export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphCalendarEndpoint: "https://graph.microsoft.com/v1.0/me/calendar/events"
  };